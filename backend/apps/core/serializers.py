import os
from rest_framework import serializers
from apps.core.models import ConfiguracaoBranding
from apps.core.validators import validar_cnpj, validar_imagem_branding


class BrandingPublicoSerializer(serializers.ModelSerializer):
    """
    Serializer para apresentação pública e geral da marca corporativa.
    Não expõe dados fiscais internos ou documentos de representação jurídica.
    """
    logotipo_url = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracaoBranding
        fields = [
            "nome_fantasia",
            "slogan",
            "logotipo_url",
            "telefone_suporte",
            "email_suporte",
            "url_shm",
            "cor_primaria_hex",
        ]

    def get_logotipo_url(self, obj) -> str | None:
        if obj.logotipo and hasattr(obj.logotipo, "url"):
            request = self.context.get("request")
            return request.build_absolute_uri(obj.logotipo.url) if request else obj.logotipo.url
        return None


class ConfiguracaoBrandingAdminSerializer(serializers.ModelSerializer):
    """
    Serializer administrativo completo para consulta e atualização dos dados institucionais,
    fiscais, contatos e chancela do representante legal com upload de mídias.
    """
    logotipo_url = serializers.SerializerMethodField()
    representante_assinatura_url = serializers.SerializerMethodField()
    atualizado_por_nome = serializers.SerializerMethodField()
    remover_logotipo = serializers.BooleanField(write_only=True, required=False, default=False)
    remover_assinatura = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = ConfiguracaoBranding
        fields = [
            "id",
            "razao_social",
            "nome_fantasia",
            "cnpj",
            "logotipo",
            "logotipo_url",
            "remover_logotipo",
            "telefone_suporte",
            "email_suporte",
            "url_shm",
            "slogan",
            "endereco_completo",
            "representante_nome_completo",
            "representante_cargo",
            "representante_documento",
            "representante_assinatura",
            "representante_assinatura_url",
            "remover_assinatura",
            "mensagem_rodape_relatorio",
            "cor_primaria_hex",
            "atualizado_em",
            "atualizado_por",
            "atualizado_por_nome",
        ]
        read_only_fields = [
            "id",
            "logotipo_url",
            "representante_assinatura_url",
            "atualizado_em",
            "atualizado_por",
            "atualizado_por_nome",
        ]
        extra_kwargs = {
            "logotipo": {"write_only": True, "required": False},
            "representante_assinatura": {"write_only": True, "required": False},
        }

    def update(self, instance, validated_data):
        remover_logotipo = validated_data.pop("remover_logotipo", False)
        remover_assinatura = validated_data.pop("remover_assinatura", False)

        if remover_logotipo and instance.logotipo:
            instance.logotipo.delete(save=False)
            instance.logotipo = None

        if remover_assinatura and instance.representante_assinatura:
            instance.representante_assinatura.delete(save=False)
            instance.representante_assinatura = None

        return super().update(instance, validated_data)

    def get_logotipo_url(self, obj) -> str | None:
        if obj.logotipo and hasattr(obj.logotipo, "url"):
            request = self.context.get("request")
            return request.build_absolute_uri(obj.logotipo.url) if request else obj.logotipo.url
        return None

    def get_representante_assinatura_url(self, obj) -> str | None:
        if obj.representante_assinatura and hasattr(obj.representante_assinatura, "url"):
            request = self.context.get("request")
            return request.build_absolute_uri(obj.representante_assinatura.url) if request else obj.representante_assinatura.url
        return None

    def get_atualizado_por_nome(self, obj) -> str | None:
        if obj.atualizado_por:
            return obj.atualizado_por.get_full_name() or obj.atualizado_por.username
        return None

    def validate_cnpj(self, value):
        if value:
            validar_cnpj(value)
        return value

    def validate_logotipo(self, value):
        if value:
            validar_imagem_branding(value)
        return value

    def validate_representante_assinatura(self, value):
        if value:
            validar_imagem_branding(value)
        return value
