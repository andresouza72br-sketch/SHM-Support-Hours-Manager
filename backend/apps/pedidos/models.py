import os
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.core.models import TimeStampedModel
from apps.core.storage import (
    caminho_anexo_pedido,
    agendar_sincronizacao_arquivo,
    agendar_expurgo_arquivo_drive,
    calcular_hash_sha256,
)

class StatusPedido(models.TextChoices):
    ABERTO = "aberto", "Aberto"
    EM_ORCAMENTO = "em_orcamento", "Em Orçamento"
    AGUARDANDO_APROVACAO = "aguardando_aprovacao", "Aguardando Aprovação"
    EM_EXECUCAO = "em_execucao", "Em Execução"
    AGUARDANDO_ACEITE = "aguardando_aceite", "Aguardando Aceite"
    CONCLUIDO = "concluido", "Concluído"
    CANCELADO = "cancelado", "Cancelado"

class PrioridadePedido(models.TextChoices):
    BAIXA = "baixa", "Baixa"
    MEDIA = "media", "Média"
    ALTA = "alta", "Alta"
    URGENTE = "urgente", "Urgente"

class Pedido(TimeStampedModel):
    protocolo = models.CharField("protocolo", max_length=20, unique=True, db_index=True)
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="cliente",
    )
    assunto = models.CharField("assunto", max_length=200)
    descricao = models.TextField("descrição detalhada")
    status = models.CharField(
        "status",
        max_length=25,
        choices=StatusPedido.choices,
        default=StatusPedido.ABERTO,
        db_index=True,
    )
    prioridade = models.CharField(
        "prioridade",
        max_length=10,
        choices=PrioridadePedido.choices,
        default=PrioridadePedido.MEDIA,
        db_index=True,
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pedidos_criados",
    )

    class Meta:
        db_table = "shm_pedido"
        ordering = ["-criado_em"]
        verbose_name = "pedido de suporte"
        verbose_name_plural = "pedidos de suporte"

    def __str__(self):
        return f"{self.protocolo} — {self.assunto}"

class AnexoPedido(TimeStampedModel):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField("arquivo", upload_to=caminho_anexo_pedido)
    nome_original = models.CharField("nome original", max_length=255)
    tamanho = models.IntegerField("tamanho em bytes", default=0)
    hash_sha256 = models.CharField("hash SHA-256", max_length=64, blank=True, default="")
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "shm_anexo_pedido"

    def __str__(self):
        return f"{self.nome_original} ({self.pedido.protocolo})"


@receiver(post_save, sender=AnexoPedido)
def disparar_sincronizacao_anexo_pedido(sender, instance, created, **kwargs):
    """Calcula SHA-256 e despacha espelhamento assíncrono para o Google Drive corporativo."""
    if instance.arquivo:
        try:
            caminho_rel = str(instance.arquivo)
            caminho_abs = os.path.join(settings.MEDIA_ROOT, caminho_rel)
            if os.path.exists(caminho_abs) and not instance.hash_sha256:
                with open(caminho_abs, "rb") as f:
                    instance.hash_sha256 = calcular_hash_sha256(f)
                    AnexoPedido.objects.filter(id=instance.id).update(hash_sha256=instance.hash_sha256)

            cliente = getattr(instance.pedido, "cliente", None)
            agendar_sincronizacao_arquivo(
                origem_modelo="pedidos.AnexoPedido",
                origem_id=str(instance.id),
                caminho_local=caminho_rel,
                nome_arquivo=instance.nome_original or os.path.basename(caminho_rel),
                tamanho_bytes=instance.tamanho,
                hash_sha256=instance.hash_sha256,
                cliente=cliente,
            )
        except Exception:
            pass


@receiver(post_delete, sender=AnexoPedido)
def remover_arquivo_fisico_anexo_pedido(sender, instance, **kwargs):
    """Remove o arquivo físico da VPS e expurga o espelho no Google Drive corporativo."""
    from apps.core.models import RegistroSincronizacaoDrive
    # 1. Remove da nuvem (Google Drive)
    reg = RegistroSincronizacaoDrive.objects.filter(
        origem_modelo="pedidos.AnexoPedido",
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