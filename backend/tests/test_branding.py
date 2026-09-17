import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.core.exceptions import ValidationError
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.core.models import ConfiguracaoBranding
from apps.core.validators import validar_cnpj


@pytest.mark.django_db
class TestBrandingModelAndValidators:
    def test_validador_cnpj(self):
        # CNPJ válido de teste com dígitos verificadores corretos (Receita Federal)
        # Exemplo real de algoritmo: 11.222.333/0001-81
        assert validar_cnpj("11.222.333/0001-81") == "11222333000181"
        assert validar_cnpj("11222333000181") == "11222333000181"

        # CNPJs inválidos
        with pytest.raises(ValidationError):
            validar_cnpj("11.111.111/1111-11")  # Dígitos repetidos
        with pytest.raises(ValidationError):
            validar_cnpj("123")  # Tamanho incorreto
        with pytest.raises(ValidationError):
            validar_cnpj("11.222.333/0001-99")  # Dígito verificador incorreto

    def test_singleton_get_instancia_e_persistencia(self):
        instancia1 = ConfiguracaoBranding.get_instancia()
        assert instancia1.id == 1
        assert instancia1.nome_fantasia == "SHM Tecnologia"

        # Atualizar dados
        instancia1.slogan = "Novo Slogan de Teste"
        instancia1.save()

        # Segunda busca deve manter id=1 e novo slogan
        instancia2 = ConfiguracaoBranding.get_instancia()
        assert instancia2.id == 1
        assert instancia2.slogan == "Novo Slogan de Teste"

        # Tentativa de exclusão não remove a instância
        instancia2.delete()
        assert ConfiguracaoBranding.objects.filter(id=1).exists()


@pytest.mark.django_db
class TestBrandingAPI:
    def setup_method(self):
        self.client = APIClient()

        self.cliente_org = Cliente.objects.create(
            razao_social="Cliente Teste Ltda",
            nome_fantasia="Cliente Teste",
            cnpj="11222333000181",
            tipo=TipoCliente.PJ,
        )

        self.admin_empresa = User.objects.create_user(
            username="admin_branding",
            email="admin@shmempresa.com.br",
            role=UserRole.EMPRESA_ADMIN,
        )

        self.tecnico_empresa = User.objects.create_user(
            username="tecnico_branding",
            email="tecnico@shmempresa.com.br",
            role=UserRole.EMPRESA_TECNICO,
        )

        self.cliente_gerente = User.objects.create_user(
            username="gerente_cliente",
            email="gerente@clienteteste.com.br",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente_org,
        )

    def test_endpoint_publico_acessivel_anonimo(self):
        resp = self.client.get("/api/v1/branding/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "nome_fantasia" in data
        assert "slogan" in data
        assert "telefone_suporte" in data
        assert "url_shm" in data
        assert "cor_primaria_hex" in data
        # Dados restritos de backoffice e auditoria não devem vazar na rota pública
        assert "cnpj" not in data
        assert "razao_social" not in data
        assert "representante_documento" not in data

    def test_endpoint_admin_bloqueado_para_anonimo_e_cliente(self):
        # Anônimo
        resp_anon = self.client.get("/api/v1/admin/branding/")
        assert resp_anon.status_code == status.HTTP_401_UNAUTHORIZED

        # Cliente Gerente
        self.client.force_authenticate(user=self.cliente_gerente)
        resp_cli = self.client.get("/api/v1/admin/branding/")
        assert resp_cli.status_code == status.HTTP_403_FORBIDDEN

        # Técnico da Empresa (não é ADMIN)
        self.client.force_authenticate(user=self.tecnico_empresa)
        resp_tec = self.client.get("/api/v1/admin/branding/")
        assert resp_tec.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_consulta_e_atualiza_branding(self):
        self.client.force_authenticate(user=self.admin_empresa)

        # Consulta
        resp = self.client.get("/api/v1/admin/branding/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["id"] == 1
        assert "razao_social" in data
        assert "cnpj" in data
        assert "representante_cargo" in data

        # Atualização via PATCH
        payload = {
            "nome_fantasia": "SHM Governança Premium",
            "telefone_suporte": "(11) 99999-8888",
            "slogan": "Transparência Absoluta em Horas",
            "representante_nome_completo": "Dr. Fernando Henrique",
            "representante_cargo": "Auditor Chefe",
            "representante_documento": "OAB/SP 123.456",
            "cnpj": "11.222.333/0001-81",
        }
        resp_patch = self.client.patch("/api/v1/admin/branding/", payload, format="json")
        assert resp_patch.status_code == status.HTTP_200_OK
        data_patch = resp_patch.json()
        assert data_patch["nome_fantasia"] == "SHM Governança Premium"
        assert data_patch["telefone_suporte"] == "(11) 99999-8888"
        assert data_patch["representante_nome_completo"] == "Dr. Fernando Henrique"
        assert data_patch["atualizado_por_nome"] == "admin_branding"

        # Conferir reflexo na rota pública
        self.client.force_authenticate(user=None)
        resp_pub = self.client.get("/api/v1/branding/")
        assert resp_pub.status_code == status.HTTP_200_OK
        assert resp_pub.json()["nome_fantasia"] == "SHM Governança Premium"

    def test_admin_bloqueado_ao_enviar_cnpj_invalido(self):
        self.client.force_authenticate(user=self.admin_empresa)
        resp = self.client.patch(
            "/api/v1/admin/branding/",
            {"cnpj": "00.000.000/0000-00"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "cnpj" in resp.json()

    def test_validacao_tamanho_imagem_branding_5mb(self):
        from apps.core.validators import validar_imagem_branding, TAMANHO_MAXIMO_IMAGEM_BRANDING_BYTES
        from django.core.exceptions import ValidationError
        from django.core.files.uploadedfile import SimpleUploadedFile

        assert TAMANHO_MAXIMO_IMAGEM_BRANDING_BYTES == 5 * 1024 * 1024

        # Arquivo SVG de 3 MB (abaixo do novo limite de 5MB, deve passar com sucesso)
        svg_content = b"<svg width='100' height='100'></svg>" + b" " * (3 * 1024 * 1024)
        arquivo_3mb = SimpleUploadedFile("logo.svg", svg_content, content_type="image/svg+xml")
        validar_imagem_branding(arquivo_3mb)

        # Arquivo de 5.5 MB (acima do novo limite de 5MB, deve ser bloqueado)
        arquivo_excedente = SimpleUploadedFile(
            "logo.svg",
            b"<svg></svg>" + b" " * (6 * 1024 * 1024),
            content_type="image/svg+xml"
        )
        with pytest.raises(ValidationError) as exc:
            validar_imagem_branding(arquivo_excedente)
        assert "5.0 MB" in str(exc.value)
