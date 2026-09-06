import re
import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.core.models import TimeStampedModel

class TipoCliente(models.TextChoices):
    PF = "PF", "Pessoa Física"
    PJ = "PJ", "Pessoa Jurídica"

class StatusCliente(models.TextChoices):
    PENDENTE_APROVACAO = "pendente_aprovacao", "Pendente de Aprovação"
    ATIVO = "ativo", "Ativo"
    SUSPENSO = "suspenso", "Suspenso"
    INATIVO = "inativo", "Inativo"

class TipoEventoClienteAudit(models.TextChoices):
    CRIACAO = "CRIACAO", "Criação de Cadastro"
    ALTERACAO = "ALTERACAO", "Alteração Cadastral"
    APROVACAO = "APROVACAO", "Aprovação de Cadastro (Magic Link)"
    EXCLUSAO = "EXCLUSAO", "Exclusão Definitiva de Cliente"

def validar_cnpj(cnpj: str) -> bool:
    cnpj_limpo = re.sub(r"\D", "", cnpj or "")
    if len(cnpj_limpo) != 14:
        return False
    if cnpj_limpo == cnpj_limpo[0] * 14:
        return False
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma1 = sum(int(cnpj_limpo[i]) * pesos1[i] for i in range(12))
    resto1 = soma1 % 11
    d1 = 0 if resto1 < 2 else 11 - resto1
    if int(cnpj_limpo[12]) != d1:
        return False
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma2 = sum(int(cnpj_limpo[i]) * pesos2[i] for i in range(13))
    resto2 = soma2 % 11
    d2 = 0 if resto2 < 2 else 11 - resto2
    return int(cnpj_limpo[13]) == d2

def validar_cpf(cpf: str) -> bool:
    cpf_limpo = re.sub(r"\D", "", cpf or "")
    if len(cpf_limpo) != 11:
        return False
    if cpf_limpo == cpf_limpo[0] * 11:
        return False
    soma1 = sum(int(cpf_limpo[i]) * (10 - i) for i in range(9))
    resto1 = soma1 % 11
    d1 = 0 if resto1 < 2 else 11 - resto1
    if int(cpf_limpo[9]) != d1:
        return False
    soma2 = sum(int(cpf_limpo[i]) * (11 - i) for i in range(10))
    resto2 = soma2 % 11
    d2 = 0 if resto2 < 2 else 11 - resto2
    return int(cpf_limpo[10]) == d2

class Cliente(TimeStampedModel):
    tipo = models.CharField("tipo", max_length=2, choices=TipoCliente.choices, default=TipoCliente.PJ, db_index=True)
    razao_social = models.CharField("razão social", max_length=200, blank=True, null=True)
    nome_fantasia = models.CharField("nome fantasia", max_length=200, blank=True, null=True)
    cnpj = models.CharField("CNPJ", max_length=18, blank=True, null=True, db_index=True)
    inscricao_estadual = models.CharField("inscrição estadual", max_length=30, blank=True, null=True)
    inscricao_municipal = models.CharField("inscrição municipal", max_length=30, blank=True, null=True)
    ramo_atividade = models.CharField("ramo de atividade / segmento", max_length=100, blank=True, null=True)
    
    nome_completo = models.CharField("nome completo", max_length=200, blank=True, null=True)
    cpf = models.CharField("CPF", max_length=14, blank=True, null=True, db_index=True)
    rg = models.CharField("RG", max_length=20, blank=True, null=True)
    data_nascimento = models.DateField("data de nascimento", blank=True, null=True)
    
    email_contato = models.EmailField("e-mail de contato", max_length=254)
    telefone = models.CharField("telefone", max_length=20, blank=True, null=True)
    celular_whatsapp = models.CharField("celular / WhatsApp", max_length=20, blank=True, null=True)
    pessoa_contato = models.CharField("pessoa de contato", max_length=150, blank=True, null=True)
    cargo_contato = models.CharField("cargo do contato", max_length=100, blank=True, null=True)
    site_url = models.CharField("site / domínio", max_length=255, blank=True, null=True)
    
    cep = models.CharField("CEP", max_length=9, blank=True, null=True)
    logradouro = models.CharField("logradouro", max_length=200, blank=True, null=True)
    numero = models.CharField("número", max_length=20, blank=True, null=True)
    complemento = models.CharField("complemento", max_length=100, blank=True, null=True)
    bairro = models.CharField("bairro", max_length=100, blank=True, null=True)
    cidade = models.CharField("cidade", max_length=100, blank=True, null=True)
    estado = models.CharField("UF", max_length=2, blank=True, null=True)
    pais = models.CharField("país", max_length=50, default="Brasil", blank=True)
    
    logo = models.ImageField("logo da empresa", upload_to="clientes/logos/", null=True, blank=True)
    cor_primaria_hex = models.CharField("cor primária (HEX)", max_length=7, blank=True, null=True)
    emails_notificacao_padrao = models.JSONField("e-mails padrão de notificação", default=list, blank=True)
    status = models.CharField("status", max_length=25, choices=StatusCliente.choices, default=StatusCliente.PENDENTE_APROVACAO, db_index=True)
    motivo_bloqueio = models.TextField("motivo do bloqueio / inativação", blank=True, null=True)
    observacoes_internas = models.TextField("observações internas", blank=True, null=True)

    # Campos de Validação de E-mail e Aprovação do Gestor (Magic Link de 7 dias)
    email_verificado = models.BooleanField("e-mail verificado", default=False)
    email_verificado_em = models.DateTimeField("e-mail verificado em", null=True, blank=True)
    aprovado_em = models.DateTimeField("data de aprovação / aceite", null=True, blank=True)
    aprovado_por_nome = models.CharField("aprovado por (nome)", max_length=150, blank=True, null=True)
    aprovado_por_email = models.EmailField("aprovado por (e-mail)", blank=True, null=True)
    aprovado_ip = models.GenericIPAddressField("IP da aprovação", null=True, blank=True)
    aprovado_user_agent = models.TextField("User-Agent da aprovação", null=True, blank=True)

    # Campos de Integração e Compartilhamento Google Drive Corporativo
    email_google_drive = models.EmailField("e-mail Google para Drive", blank=True, null=True, help_text="E-mail da conta Google para concessão de acesso à pasta corporativa compartilhada")
    gdrive_folder_id = models.CharField("ID da pasta Google Drive", max_length=128, blank=True, null=True, db_index=True)
    gdrive_folder_url = models.URLField("URL da pasta no Google Drive", max_length=500, blank=True, null=True)
    gdrive_shared_at = models.DateTimeField("compartilhado no Google Drive em", blank=True, null=True)

    class Meta:
        db_table = "shm_cliente"
        ordering = ["-criado_em"]
        verbose_name = "cliente"
        verbose_name_plural = "clientes"

    def __str__(self):
        if self.tipo == TipoCliente.PJ:
            return self.nome_fantasia or self.razao_social or f"PJ #{self.id}"
        return self.nome_completo or f"PF #{self.id}"

    @property
    def display_name(self) -> str:
        return str(self)

    @property
    def logo_url(self) -> str | None:
        if self.logo and hasattr(self.logo, "url"):
            return self.logo.url
        return None

    def clean(self):
        if self.tipo == TipoCliente.PJ:
            if not self.razao_social:
                raise ValidationError({"razao_social": "Razão social é obrigatória para Pessoa Jurídica."})
            if not self.cnpj:
                raise ValidationError({"cnpj": "CNPJ é obrigatório para Pessoa Jurídica."})
        elif self.tipo == TipoCliente.PF:
            if not self.nome_completo:
                raise ValidationError({"nome_completo": "Nome completo é obrigatório para Pessoa Física."})
            if not self.cpf:
                raise ValidationError({"cpf": "CPF é obrigatório para Pessoa Física."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class ClienteAceiteLink(TimeStampedModel):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="aceite_links",
        verbose_name="cliente",
    )
    token = models.UUIDField("token", default=uuid.uuid4, unique=True, editable=False)
    data_expiracao = models.DateTimeField("data de expiração")
    usado = models.BooleanField("usado", default=False)
    usado_em = models.DateTimeField("usado em", null=True, blank=True)
    usado_ip = models.GenericIPAddressField("IP de uso", null=True, blank=True)
    usado_user_agent = models.TextField("User-Agent de uso", null=True, blank=True)

    class Meta:
        db_table = "shm_cliente_aceite_link"
        ordering = ["-criado_em"]
        verbose_name = "link de aprovação/aceite de cliente"
        verbose_name_plural = "links de aprovação/aceite de clientes"

    def __str__(self):
        return f"ClienteAceiteLink {self.token} — {self.cliente}"

    @property
    def is_expirado(self) -> bool:
        return timezone.now() > self.data_expiracao


class ClienteAuditLog(models.Model):
    cliente_id = models.IntegerField("ID do cliente", db_index=True, null=True, blank=True)
    cliente_nome = models.CharField("nome / razão social do cliente", max_length=255)
    cliente_documento = models.CharField("CNPJ / CPF do cliente", max_length=50, blank=True, null=True)
    tipo_evento = models.CharField(
        "tipo de evento",
        max_length=40,
        choices=TipoEventoClienteAudit.choices,
        default=TipoEventoClienteAudit.EXCLUSAO,
        db_index=True,
    )
    descricao = models.TextField("descrição do evento")
    justificativa = models.TextField("justificativa / motivo", blank=True, null=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias_cliente",
        verbose_name="usuário autor",
    )
    usuario_nome = models.CharField("nome do usuário autor", max_length=150, blank=True, null=True)
    usuario_email = models.EmailField("e-mail do usuário autor", blank=True, null=True)
    usuario_role = models.CharField("papel do usuário", max_length=50, blank=True, null=True)
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
    timestamp = models.DateTimeField("data e hora", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "shm_cliente_audit_log"
        ordering = ["-timestamp"]
        verbose_name = "registro de auditoria de cliente"
        verbose_name_plural = "registros de auditoria de clientes"

    def __str__(self):
        return f"[{self.timestamp.strftime('%d/%m/%Y %H:%M')}] {self.get_tipo_evento_display()} - {self.cliente_nome}"