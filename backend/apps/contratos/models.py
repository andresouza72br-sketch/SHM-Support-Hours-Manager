import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.serializers.json import DjangoJSONEncoder
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from apps.core.models import TimeStampedModel

EXTENSOES_PERMITIDAS_DOCUMENTO = [
    "pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "ppt", "pptx", "mp3"
]

class StatusContrato(models.TextChoices):
    PENDENTE_ACEITE = "pendente_aceite", "Pendente de Aceite"
    ATIVO = "ativo", "Ativo"
    CONCLUIDO = "concluido", "Concluído"
    CANCELADO = "cancelado", "Cancelado"
    SUSPENSO = "suspenso", "Suspenso"
    EXPIRADO = "expirado", "Expirado"

class TipoContrato(models.TextChoices):
    NOVO = "novo", "Novo"
    ADITIVO = "aditivo", "Aditivo"
    RENOVACAO = "renovacao", "Renovação"

class TipoDocumentoContrato(models.TextChoices):
    PROPOSTA = "proposta", "Proposta Comercial"
    CONTRATO_ASSINADO = "contrato_assinado", "Contrato Assinado"
    ADITIVO = "aditivo", "Termo Aditivo"
    DISTRATO = "distrato", "Distrato / Rescisão"
    OUTRO = "outro", "Outro Documento"

class StatusConfirmacaoEmail(models.TextChoices):
    PENDENTE = "pendente", "Pendente de Confirmação"
    CONFIRMADO = "confirmado", "Confirmado / Ativo"
    RECUSADO = "recusado", "Recusado pelo Destinatário"
    EXPIRADO = "expirado", "Expirado"

class TipoEventoContratoAudit(models.TextChoices):
    CRIACAO = "criacao", "Criação de Contrato"
    ACEITE = "aceite", "Aceite Formalizado"
    ALTERACAO = "alteracao", "Alteração Cadastral"
    CONCLUSAO = "conclusao", "Contrato Concluído"
    CANCELAMENTO = "cancelamento", "Contrato Cancelado"
    UPLOAD_DOCUMENTO = "upload_documento", "Upload de Documento"
    DOWNLOAD_DOCUMENTO = "download_documento", "Download de Documento"
    EXCLUSAO_DOCUMENTO = "exclusao_documento", "Exclusão de Documento"
    ATUALIZACAO_EMAILS = "atualizacao_emails", "Atualização de E-mails de Notificação"
    CONVITE_EMAIL = "convite_email", "Convite de E-mail de Notificação"
    CONFIRMACAO_EMAIL = "confirmacao_email", "Confirmação de E-mail de Notificação"
    RECUSA_EMAIL = "recusa_email", "Recusa de E-mail de Notificação"
    DOWNLOAD_RELATORIO = "download_relatorio", "Download / Impressão de Relatório"
    ENVIO_RELATORIO = "envio_relatorio", "Envio sob Demanda de Relatório"
    ENVIO_MENSAL_RELATORIO = "envio_mensal_relatorio", "Envio Mensal Automatizado de Relatório"
    AVALIACAO_CICLO = "avaliacao_ciclo", "Avaliação de Ciclo"


class ContratoQuerySet(models.QuerySet):
    def elegiveis_para_migracao(self, cliente_id, destino_id=None):
        hoje = timezone.localdate()
        qs = self.filter(
            cliente_id=cliente_id,
            saldo__gt=0,
        ).filter(
            models.Q(status__in=[StatusContrato.EXPIRADO, StatusContrato.CONCLUIDO])
            | models.Q(data_termino__lt=hoje)
        )
        if destino_id:
            qs = qs.exclude(id=destino_id)
        return qs.order_by("-data_termino", "-criado_em")

    def devedores(self, cliente_id=None):
        qs = self.filter(saldo__lt=0)
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs.order_by("saldo", "-criado_em")


class Contrato(TimeStampedModel):
    objects = ContratoQuerySet.as_manager()
    numero = models.CharField("número do contrato", max_length=30, unique=True, db_index=True)
    tipo = models.CharField("tipo", max_length=15, choices=TipoContrato.choices, default=TipoContrato.NOVO)
    contrato_referencia = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="aditivos",
        verbose_name="contrato de referência",
    )
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="contratos",
        verbose_name="cliente",
    )
    data_inicio = models.DateField("data de início")
    data_termino = models.DateField("data de término", null=True, blank=True)
    horas_contratadas = models.DecimalField("horas contratadas", max_digits=10, decimal_places=2)
    saldo = models.DecimalField("saldo de horas", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    horas_consumidas = models.DecimalField("horas consumidas", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    data_fim_carencia = models.DateField("data fim de carência", null=True, blank=True)
    descricao_servicos = models.TextField("descrição dos serviços", blank=True, null=True)
    valor_mensal = models.DecimalField("valor mensal", max_digits=12, decimal_places=2, null=True, blank=True)
    dia_faturamento = models.PositiveSmallIntegerField("dia de faturamento", null=True, blank=True)
    gestor_nome = models.CharField("nome do gestor responsável", max_length=150, blank=True, null=True)
    gestor_email = models.EmailField("e-mail do gestor", blank=True, null=True)
    gestor_telefone = models.CharField("telefone do gestor", max_length=30, blank=True, null=True)
    emails_notificacao = models.JSONField("e-mails para notificação", default=list, blank=True)
    observacoes = models.TextField("observações", blank=True, null=True)
    status = models.CharField("status", max_length=20, choices=StatusContrato.choices, default=StatusContrato.PENDENTE_ACEITE, db_index=True)
    data_aceite = models.DateTimeField("data de aceite", null=True, blank=True)
    justificativa_cancelamento = models.TextField("justificativa de cancelamento", blank=True, null=True)
    cancelado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_cancelados",
        verbose_name="cancelado por",
    )
    cancelado_em = models.DateTimeField("cancelado em", null=True, blank=True)
    concluido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_concluidos",
        verbose_name="concluído por",
    )
    concluido_em = models.DateTimeField("concluído em", null=True, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="contratos_criados",
        verbose_name="criado por",
    )

    class Meta:
        db_table = "shm_contrato"
        ordering = ["-criado_em"]
        verbose_name = "contrato"
        verbose_name_plural = "contratos"

    def __str__(self):
        return f"{self.numero} — {self.cliente}"

    @property
    def em_carencia(self) -> bool:
        if self.data_fim_carencia:
            dt = self.data_fim_carencia
            if isinstance(dt, str):
                from datetime import date
                try:
                    dt = date.fromisoformat(dt.strip().split("T")[0])
                except (ValueError, TypeError):
                    return False
            return dt >= timezone.localdate()
        return False

    @property
    def saldo_devedor(self) -> Decimal:
        return abs(self.saldo) if self.saldo < 0 else Decimal("0.00")

    @property
    def saldo_remanescente(self) -> Decimal:
        if self.saldo > 0 and self.status == StatusContrato.EXPIRADO and self.em_carencia:
            return self.saldo
        return Decimal("0.00")

class ContratoDocumento(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="documentos", verbose_name="contrato")
    arquivo = models.FileField(
        "arquivo do documento",
        upload_to="contratos/documentos/%Y/%m/",
        validators=[FileExtensionValidator(allowed_extensions=EXTENSOES_PERMITIDAS_DOCUMENTO)],
    )
    nome_original = models.CharField("nome original", max_length=255)
    tipo_documento = models.CharField(
        "tipo de documento",
        max_length=30,
        choices=TipoDocumentoContrato.choices,
        default=TipoDocumentoContrato.OUTRO,
    )
    tamanho_bytes = models.BigIntegerField("tamanho em bytes", default=0)
    hash_sha256 = models.CharField("hash SHA-256", max_length=64, blank=True, default="", db_index=True)
    algoritmo_hash = models.CharField("algoritmo de hash", max_length=20, default="SHA-256")
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documentos_contrato_enviados",
        verbose_name="enviado por",
    )

    class Meta:
        db_table = "shm_contrato_documento"
        ordering = ["-criado_em"]
        verbose_name = "documento do contrato"
        verbose_name_plural = "documentos do contrato"

    def __str__(self):
        return f"{self.nome_original} ({self.get_tipo_documento_display()}) — {self.contrato.numero}"

class ContratoPDF(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="pdfs")
    arquivo = models.FileField("arquivo PDF", upload_to="contratos/%Y/%m/")
    nome_original = models.CharField("nome original", max_length=255)

    class Meta:
        db_table = "shm_contrato_pdf"

class ContratoAuditLog(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="auditoria", verbose_name="contrato")
    tipo_evento = models.CharField("tipo de evento", max_length=40, choices=TipoEventoContratoAudit.choices)
    descricao = models.TextField("descrição do evento")
    justificativa = models.TextField("justificativa / motivo", blank=True, null=True)
    documento_nome = models.CharField("nome do documento", max_length=255, blank=True, null=True)
    documento_hash = models.CharField("hash SHA-256 do documento", max_length=64, blank=True, null=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias_contrato",
        verbose_name="usuário autor",
    )
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
    timestamp = models.DateTimeField("data e hora", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "shm_contrato_audit_log"
        ordering = ["-timestamp"]
        verbose_name = "registro de auditoria de contrato"
        verbose_name_plural = "registros de auditoria de contrato"

    def __str__(self):
        return f"[{self.timestamp.strftime('%d/%m/%Y %H:%M')}] {self.get_tipo_evento_display()} - {self.contrato.numero}"


class NivelRelevanciaAudit(models.TextChoices):
    N1 = "N1", "Nível 1 - Crítico"
    N2 = "N2", "Nível 2 - Operacional"
    N3 = "N3", "Nível 3 - Informativo"


class ForensicAuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError(
            "Registros de auditoria forense são estritamente imutáveis (append-only). Alterações são proibidas."
        )

    def delete(self):
        raise ValidationError(
            "Registros de auditoria forense são estritamente imutáveis (append-only). Exclusões são proibidas."
        )


class ForensicAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    particao = models.CharField("partição de auditoria", max_length=64, db_index=True)
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="trilha_forense",
        verbose_name="contrato auditado",
    )
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="trilha_forense",
        verbose_name="cliente tomador",
    )
    sequencia = models.BigIntegerField("sequência pericial", db_index=True)
    tipo_evento = models.CharField("tipo de evento", max_length=60, db_index=True)
    nivel_relevancia = models.CharField(
        "nível de relevância",
        max_length=10,
        choices=NivelRelevanciaAudit.choices,
        default=NivelRelevanciaAudit.N1,
        db_index=True,
    )
    descricao = models.TextField("descrição do evento")
    justificativa = models.TextField("justificativa técnica", blank=True, null=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias_forenses",
        verbose_name="operador",
    )
    usuario_nome = models.CharField("nome do operador", max_length=150, blank=True, null=True)
    usuario_email = models.EmailField("e-mail do operador", blank=True, null=True)
    usuario_role = models.CharField("papel do operador", max_length=50, blank=True, null=True)
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
    dados_payload = models.JSONField("carga útil de contexto", default=dict, blank=True, encoder=DjangoJSONEncoder)
    payload_hash = models.CharField("hash SHA-256 do payload", max_length=64)
    previous_hash = models.CharField("hash SHA-256 anterior", max_length=64, db_index=True)
    current_hash = models.CharField("hash SHA-256 atual", max_length=64, unique=True, db_index=True)
    timestamp = models.DateTimeField("data e hora UTC", default=timezone.now, db_index=True)

    objects = ForensicAuditLogQuerySet.as_manager()

    class Meta:
        db_table = "shm_forensic_audit_trail"
        ordering = ["particao", "sequencia"]
        verbose_name = "registro pericial de auditoria forense"
        verbose_name_plural = "registros periciais de auditoria forense"
        constraints = [
            models.UniqueConstraint(fields=["particao", "sequencia"], name="unique_particao_sequencia"),
            models.UniqueConstraint(fields=["particao", "current_hash"], name="unique_particao_current_hash"),
        ]

    def __str__(self):
        return f"[{self.particao} #{self.sequencia}] {self.tipo_evento} ({self.current_hash[:8]}...)"

    def get_tipo_evento_display(self):
        mapa_display = {
            "criacao": "Criação de Contrato",
            "CONTRATO_CRIACAO": "Criação de Contrato",
            "aceite": "Aceite Formalizado",
            "alteracao": "Alteração Cadastral",
            "conclusao": "Contrato Concluído",
            "cancelamento": "Contrato Cancelado",
            "upload_documento": "Upload de Documento",
            "CONTRATO_DOCUMENTO_UPLOAD": "Upload de Documento",
            "download_documento": "Download de Documento",
            "exclusao_documento": "Exclusão de Documento",
            "atualizacao_emails": "Atualização de E-mails de Notificação",
            "convite_email": "Convite de E-mail de Notificação",
            "confirmacao_email": "Confirmação de E-mail de Notificação",
            "recusa_email": "Recusa de E-mail de Notificação",
            "download_relatorio": "Download / Impressão de Relatório",
            "avaliacao_ciclo": "Avaliação de Ciclo",
            "SALDO_REABASTECIMENTO": "Carga de Franquia / Reabastecimento",
            "SALDO_CONSUMO_CICLO": "Consumo de Saldo por Aceite de Ciclo",
            "CICLO_ACEITE_EXCECAO_TOLERANCIA": "Aceite de Exceção acima da Tolerância (+30%)",
            "SALDO_MIGRACAO_ENVIO": "Transferência de Saldo (Envio)",
            "SALDO_MIGRACAO_RECEBIMENTO": "Aproveitamento de Saldo (Recebimento)",
            "SALDO_COMPENSACAO_ABATIMENTO": "Compensação de Saldo (Abatimento)",
            "SALDO_COMPENSACAO_QUITACAO": "Compensação de Saldo (Quitação)",
            "EXCLUSAO": "Exclusão Definitiva de Cliente",
            "CRIACAO": "Criação Cadastral",
        }
        return mapa_display.get(self.tipo_evento, self.tipo_evento.replace("_", " ").title())


    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            # Check if this object already exists in database
            if ForensicAuditLog.objects.filter(pk=self.pk).exists():
                raise ValidationError(
                    "Registros de auditoria forense são estritamente imutáveis (append-only). Alterações são proibidas."
                )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Registros de auditoria forense são estritamente imutáveis (append-only). Exclusões são proibidas."
        )


class AuditDailySeal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    data_referencia = models.DateField("data de referência", db_index=True)
    particao = models.CharField("partição", max_length=64, db_index=True)
    ultimo_registro_id = models.UUIDField("ID do último registro", null=True, blank=True)
    ultima_sequencia = models.BigIntegerField("última sequência", default=0)
    ultimo_hash = models.CharField("último hash", max_length=64)
    total_eventos_dia = models.PositiveIntegerField("total de eventos do dia", default=0)
    selo_digest = models.CharField("digest SHA-256 do selo", max_length=64)
    selado_em = models.DateTimeField("selado em", auto_now_add=True)

    class Meta:
        db_table = "shm_audit_daily_seal"
        ordering = ["-data_referencia", "particao"]
        verbose_name = "selo diário de integridade"
        verbose_name_plural = "selos diários de integridade"
        constraints = [
            models.UniqueConstraint(fields=["data_referencia", "particao"], name="unique_data_particao_seal")
        ]

    def __str__(self):
        return f"Selo {self.data_referencia} [{self.particao}] -> {self.selo_digest[:8]}..."

class AceiteLink(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="aceite_links")
    token = models.UUIDField("token", default=uuid.uuid4, unique=True, editable=False)
    data_expiracao = models.DateTimeField("data de expiração")
    usado = models.BooleanField("usado", default=False)
    usado_em = models.DateTimeField("usado em", null=True, blank=True)
    usado_ip = models.GenericIPAddressField("IP de uso", null=True, blank=True)
    usado_user_agent = models.TextField("User-Agent de uso", null=True, blank=True)

    class Meta:
        db_table = "shm_aceite_link"


class ContratoEmailNotificacao(TimeStampedModel):
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name="destinatarios_notificacao",
        verbose_name="contrato",
    )
    email = models.EmailField("endereço de e-mail", db_index=True)
    nome = models.CharField("nome / cargo", max_length=150, blank=True, null=True)
    ativo = models.BooleanField("notificações ativas", default=True)
    status = models.CharField(
        "status de confirmação",
        max_length=20,
        choices=StatusConfirmacaoEmail.choices,
        default=StatusConfirmacaoEmail.PENDENTE,
        db_index=True,
    )
    token = models.UUIDField("token de confirmação", default=uuid.uuid4, unique=True, editable=False)
    convidado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convites_notificacao_enviados",
        verbose_name="convidado por",
    )
    convidado_em = models.DateTimeField("data do convite", auto_now_add=True)
    expira_em = models.DateTimeField("data de expiração do token")
    confirmado_em = models.DateTimeField("data de confirmação", null=True, blank=True)
    confirmado_ip = models.GenericIPAddressField("IP de confirmação", null=True, blank=True)
    confirmado_user_agent = models.TextField("User-Agent de confirmação", null=True, blank=True)

    class Meta:
        db_table = "shm_contrato_email_notificacao"
        ordering = ["-criado_em"]
        verbose_name = "e-mail de notificação de contrato"
        verbose_name_plural = "e-mails de notificação de contratos"
        constraints = [
            models.UniqueConstraint(fields=["contrato", "email"], name="unique_contrato_email_notificacao")
        ]

    def __str__(self):
        return f"{self.email} ({self.get_status_display()}) — {self.contrato.numero}"

    @property
    def is_expirado(self) -> bool:
        if self.status == StatusConfirmacaoEmail.PENDENTE and self.expira_em:
            return timezone.now() > self.expira_em
        return False

    @property
    def status_calculado(self) -> str:
        if self.is_expirado:
            return StatusConfirmacaoEmail.EXPIRADO
        return self.status

    @property
    def dias_restantes(self) -> int:
        if not self.expira_em:
            return 0
        delta = self.expira_em - timezone.now()
        return max(0, delta.days)


def caminho_extrato_contrato(instance, filename):
    import os
    cliente_id = instance.contrato.cliente_id if instance.contrato and instance.contrato.cliente_id else "geral"
    contrato_id = instance.contrato.id if instance.contrato else "geral"
    return os.path.join("clientes", str(cliente_id), "contratos", str(contrato_id), "extratos", filename)


class OrigemExtrato(models.TextChoices):
    MANUAL_DOWNLOAD = "manual_download", "Download Manual"
    MANUAL_EMAIL = "manual_email", "Envio Manual por E-mail"
    MENSAL_AUTOMATICO = "mensal_automatico", "Envio Mensal Automatizado"


class ExtratoOficialGerado(TimeStampedModel):
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name="extratos_gerados",
        verbose_name="contrato",
    )
    arquivo = models.FileField(
        "arquivo PDF",
        upload_to=caminho_extrato_contrato,
        max_length=500,
    )
    periodo_referencia = models.CharField("período de referência", max_length=7, help_text="Formato YYYY-MM")
    hash_sha256 = models.CharField("hash SHA-256", max_length=64, db_index=True)
    horas_contratadas = models.DecimalField("horas contratadas", max_digits=10, decimal_places=2)
    horas_consumidas = models.DecimalField("horas consumidas", max_digits=10, decimal_places=2)
    saldo_disponivel = models.DecimalField("saldo disponível", max_digits=10, decimal_places=2)
    creditos_migrados = models.DecimalField("créditos migrados", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    debitos_compensados = models.DecimalField("débitos compensados", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    quantidade_ciclos = models.IntegerField("quantidade de ciclos", default=0)
    origem = models.CharField("origem", max_length=30, choices=OrigemExtrato.choices, default=OrigemExtrato.MANUAL_DOWNLOAD)
    gerado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="extratos_gerados",
        verbose_name="gerado por",
    )
    destinatarios_notificados = models.JSONField("destinatários notificados", default=list, blank=True)
    gdrive_file_id = models.CharField("ID no Google Drive", max_length=150, blank=True, default="")
    gdrive_file_url = models.URLField("URL no Google Drive", blank=True, default="")
    sincronizado_drive_em = models.DateTimeField("sincronizado com Google Drive em", null=True, blank=True)

    class Meta:
        db_table = "shm_extratos_oficiais"
        ordering = ["-criado_em"]
        verbose_name = "extrato oficial gerado"
        verbose_name_plural = "extratos oficiais gerados"

    def __str__(self):
        return f"Extrato {self.contrato.numero} ({self.periodo_referencia}) - {self.hash_sha256[:8]}"