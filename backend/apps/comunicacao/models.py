import os
import uuid
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.core.models import TimeStampedModel
from apps.core.storage import (
    caminho_anexo_comentario,
    agendar_sincronizacao_arquivo,
    agendar_expurgo_arquivo_drive,
    calcular_hash_sha256,
)

class Comentario(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ciclo = models.ForeignKey("ciclos.Ciclo", on_delete=models.CASCADE, related_name="comentarios", null=True, blank=True)
    tarefa = models.ForeignKey("tarefas.Tarefa", on_delete=models.SET_NULL, related_name="comentarios", null=True, blank=True)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="comentarios")
    texto = models.TextField("texto", max_length=4000)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="respostas",
        verbose_name="comentário pai",
    )
    tarefa_convertida = models.ForeignKey("tarefas.Tarefa", on_delete=models.SET_NULL, null=True, blank=True, related_name="comentarios_origem")

    class Meta:
        db_table = "shm_comentario"
        ordering = ["criado_em"]


class AnexoComentario(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comentario = models.ForeignKey(Comentario, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField("arquivo", upload_to=caminho_anexo_comentario)
    nome_original = models.CharField("nome original", max_length=255)
    tamanho = models.IntegerField("tamanho em bytes", default=0)
    hash_sha256 = models.CharField("hash SHA-256", max_length=64, blank=True, default="")

    class Meta:
        db_table = "shm_anexo_comentario"

    def __str__(self):
        return f"{self.nome_original} ({self.tamanho}B)"


@receiver(post_save, sender=AnexoComentario)
def disparar_sincronizacao_anexo_comentario(sender, instance, created, **kwargs):
    """Calcula SHA-256 e despacha cópia para o Google Drive corporativo na pasta do cliente."""
    if instance.arquivo:
        try:
            caminho_rel = str(instance.arquivo)
            caminho_abs = os.path.join(settings.MEDIA_ROOT, caminho_rel)
            if os.path.exists(caminho_abs) and not instance.hash_sha256:
                with open(caminho_abs, "rb") as f:
                    instance.hash_sha256 = calcular_hash_sha256(f)
                    AnexoComentario.objects.filter(id=instance.id).update(hash_sha256=instance.hash_sha256)

            cliente = None
            try:
                cliente = instance.comentario.ciclo.pedido.cliente
            except Exception:
                pass

            agendar_sincronizacao_arquivo(
                origem_modelo="comunicacao.AnexoComentario",
                origem_id=str(instance.id),
                caminho_local=caminho_rel,
                nome_arquivo=instance.nome_original or os.path.basename(caminho_rel),
                tamanho_bytes=instance.tamanho,
                hash_sha256=instance.hash_sha256,
                cliente=cliente,
            )
        except Exception:
            pass


@receiver(post_delete, sender=AnexoComentario)
def remover_arquivo_fisico_anexo_comentario(sender, instance, **kwargs):
    """Remove o arquivo físico em storage local e expurga o espelho no Google Drive corporativo."""
    from apps.core.models import RegistroSincronizacaoDrive
    # 1. Remove da nuvem (Google Drive)
    reg = RegistroSincronizacaoDrive.objects.filter(
        origem_modelo="comunicacao.AnexoComentario",
        origem_id=str(instance.id),
    ).first()
    if reg and reg.gdrive_file_id:
        agendar_expurgo_arquivo_drive(reg.gdrive_file_id)

    # 2. Remove do disco local da VPS
    if instance.arquivo:
        try:
            instance.arquivo.delete(save=False)
        except Exception:
            pass


class ReacaoComentario(TimeStampedModel):
    """Reação (like/emoji) de um usuário a um comentário. Toggle único por (comentário, autor, tipo)."""

    comentario = models.ForeignKey(
        Comentario,
        on_delete=models.CASCADE,
        related_name="reacoes",
        verbose_name="comentário",
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reacoes_comentarios",
        verbose_name="autor da reação",
    )
    tipo = models.CharField(
        "tipo de reação",
        max_length=20,
        default="curtir",
        help_text="Identificador textual da reação, ex: curtir, amei, etc.",
    )

    class Meta:
        db_table = "shm_reacao_comentario"
        unique_together = ("comentario", "autor", "tipo")
        verbose_name = "reação a comentário"
        verbose_name_plural = "reações a comentários"

    def __str__(self):
        return f"{self.autor} reagiu '{self.tipo}' em {self.comentario_id}"