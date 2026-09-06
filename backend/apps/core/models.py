import uuid
from django.db import models

class TimeStampedModel(models.Model):
    criado_em = models.DateTimeField("criado em", auto_now_add=True, db_index=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        abstract = True


class StatusSincronizacaoDrive(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    SINCRONIZANDO = "sincronizando", "Sincronizando"
    SINCRONIZADO = "sincronizado", "Sincronizado"
    ERRO = "erro", "Erro"
    EXCLUIDO = "excluido", "Excluído no Drive"


class RegistroSincronizacaoDrive(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.CASCADE,
        related_name="arquivos_drive",
        null=True,
        blank=True,
        verbose_name="cliente associado",
    )
    origem_modelo = models.CharField("modelo de origem", max_length=100, db_index=True)
    origem_id = models.CharField("ID da entidade de origem", max_length=100, db_index=True)
    caminho_local = models.CharField("caminho local relativo", max_length=500)
    nome_arquivo = models.CharField("nome do arquivo", max_length=255)
    tamanho_bytes = models.BigIntegerField("tamanho em bytes", default=0)
    hash_sha256 = models.CharField("hash SHA-256", max_length=64, db_index=True)

    # Metadados Google Drive
    gdrive_file_id = models.CharField("Google Drive File ID", max_length=128, blank=True, null=True, db_index=True)
    gdrive_web_view_link = models.URLField("link de visualização no Drive", max_length=500, blank=True, null=True)

    # Controle de Sincronização e Resiliência
    status = models.CharField(
        "status",
        max_length=20,
        choices=StatusSincronizacaoDrive.choices,
        default=StatusSincronizacaoDrive.PENDENTE,
        db_index=True,
    )
    tentativas = models.IntegerField("número de tentativas", default=0)
    ultimo_erro = models.TextField("última mensagem de erro", blank=True, null=True)
    sincronizado_em = models.DateTimeField("sincronizado em", blank=True, null=True)

    class Meta:
        db_table = "shm_registro_sincronizacao_drive"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["origem_modelo", "origem_id"]),
            models.Index(fields=["status", "tentativas"]),
        ]

    def __str__(self):
        return f"{self.nome_arquivo} ({self.status}) - {self.origem_modelo}:{self.origem_id}"