import uuid
from django.conf import settings
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


class ConfiguracaoBranding(TimeStampedModel):
    """
    Configuração Institucional e de Identidade Visual (Branding) da empresa prestadora de suporte.
    Implementa o padrão Singleton (registro único fixo id=1).
    Centraliza logotipo, dados fiscais, contatos e chancela pericial do representante legal.
    """
    id = models.BigAutoField(primary_key=True, default=1, editable=False)
    razao_social = models.CharField(
        "razão social",
        max_length=200,
        default="SHM Tecnologia e Gestão de Contratos Ltda.",
    )
    nome_fantasia = models.CharField(
        "nome fantasia",
        max_length=150,
        default="SHM Tecnologia",
    )
    cnpj = models.CharField(
        "CNPJ",
        max_length=20,
        blank=True,
        default="",
    )
    logotipo = models.FileField(
        "logotipo corporativo",
        upload_to="branding/logos/",
        null=True,
        blank=True,
    )
    telefone_suporte = models.CharField(
        "telefone de suporte",
        max_length=25,
        blank=True,
        default="",
    )
    email_suporte = models.EmailField(
        "e-mail de suporte",
        blank=True,
        default="",
    )
    url_shm = models.URLField(
        "URL base do portal SHM",
        max_length=255,
        default="https://shm.empresa.com.br",
    )
    slogan = models.CharField(
        "slogan institucional",
        max_length=255,
        blank=True,
        default="Suporte Sob Medida e Gestão de Horas",
    )
    endereco_completo = models.CharField(
        "endereço completo da sede",
        max_length=300,
        blank=True,
        default="",
    )
    representante_nome_completo = models.CharField(
        "nome completo do representante legal",
        max_length=150,
        blank=True,
        default="",
    )
    representante_cargo = models.CharField(
        "cargo do representante legal",
        max_length=100,
        blank=True,
        default="Responsável Técnico",
    )
    representante_documento = models.CharField(
        "documento do representante (CPF/Conselho)",
        max_length=50,
        blank=True,
        default="",
    )
    representante_assinatura = models.FileField(
        "rubrica ou assinatura digitalizada",
        upload_to="branding/assinaturas/",
        null=True,
        blank=True,
    )
    mensagem_rodape_relatorio = models.TextField(
        "mensagem institucional de rodapé do extrato",
        blank=True,
        default="",
    )
    cor_primaria_hex = models.CharField(
        "cor primária institucional (hex)",
        max_length=7,
        default="#4F46E5",
    )
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="configuracoes_branding_atualizadas",
        verbose_name="atualizado por",
    )

    class Meta:
        db_table = "shm_configuracao_branding"
        verbose_name = "Configuração de Branding"
        verbose_name_plural = "Configurações de Branding"

    def __str__(self):
        return f"Branding Institucional - {self.nome_fantasia}"

    def clean(self):
        super().clean()
        if self.cnpj:
            from apps.core.validators import validar_cnpj
            validar_cnpj(self.cnpj)
        if self.logotipo:
            from apps.core.validators import validar_imagem_branding
            validar_imagem_branding(self.logotipo)
        if self.representante_assinatura:
            from apps.core.validators import validar_imagem_branding
            validar_imagem_branding(self.representante_assinatura)

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete("shm_configuracao_branding")

    def delete(self, *args, **kwargs):
        # Impede a exclusão do registro Singleton institucional
        pass

    @classmethod
    def get_instancia(cls) -> "ConfiguracaoBranding":
        """
        Retorna a instância única de branding da empresa do cache ou banco de dados.
        Cria com dados padrão caso o registro ainda não exista.
        """
        from django.core.cache import cache
        instancia = cache.get("shm_configuracao_branding")
        if not instancia:
            try:
                instancia = cls.objects.filter(id=1).first()
                if not instancia:
                    instancia = cls.objects.create(
                        id=1,
                        razao_social="SHM Tecnologia e Gestão de Contratos Ltda.",
                        nome_fantasia="SHM Tecnologia",
                        slogan="Suporte Sob Medida e Gestão de Horas",
                        url_shm="https://shm.empresa.com.br",
                        cor_primaria_hex="#4F46E5",
                    )
                cache.set("shm_configuracao_branding", instancia, timeout=3600)
            except Exception:
                # Fallback em memória caso as tabelas ainda estejam em migração
                instancia = cls(
                    id=1,
                    razao_social="SHM Tecnologia e Gestão de Contratos Ltda.",
                    nome_fantasia="SHM Tecnologia",
                    slogan="Suporte Sob Medida e Gestão de Horas",
                    url_shm="https://shm.empresa.com.br",
                    cor_primaria_hex="#4F46E5",
                )
        return instancia

    def obter_logo_base64(self) -> str | None:
        """
        Retorna o logotipo em formato Data URI Base64 para compilação em relatórios PDF.
        """
        if not self.logotipo:
            return None
        import base64, os
        try:
            if hasattr(self.logotipo, "path") and os.path.exists(self.logotipo.path):
                with open(self.logotipo.path, "rb") as f:
                    conteudo = f.read()
                ext = os.path.splitext(self.logotipo.path)[1].lower().replace(".", "")
                mime = "image/svg+xml" if ext == "svg" else f"image/{ext if ext != 'jpg' else 'jpeg'}"
                b64 = base64.b64encode(conteudo).decode("utf-8")
                return f"data:{mime};base64,{b64}"
        except Exception:
            return None
        return None

    def obter_assinatura_base64(self) -> str | None:
        """
        Retorna a assinatura/rubrica em formato Data URI Base64 para compilação em relatórios PDF.
        """
        if not self.representante_assinatura:
            return None
        import base64, os
        try:
            if hasattr(self.representante_assinatura, "path") and os.path.exists(self.representante_assinatura.path):
                with open(self.representante_assinatura.path, "rb") as f:
                    conteudo = f.read()
                ext = os.path.splitext(self.representante_assinatura.path)[1].lower().replace(".", "")
                mime = "image/svg+xml" if ext == "svg" else f"image/{ext if ext != 'jpg' else 'jpeg'}"
                b64 = base64.b64encode(conteudo).decode("utf-8")
                return f"data:{mime};base64,{b64}"
        except Exception:
            return None
        return None