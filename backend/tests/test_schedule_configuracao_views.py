import pytest
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.schedule.models import ConfiguracaoSchedule

@pytest.mark.django_db
class TestConfiguracaoScheduleViews:
    def setup_method(self):
        self.client = APIClient()

        self.cliente_org = Cliente.objects.create(
            razao_social="ICB Org Ltda",
            nome_fantasia="ICB",
            cnpj="11222333000199",
            tipo=TipoCliente.PJ,
        )

        self.admin_empresa = User.objects.create_user(
            username="andre_admin",
            email="andresouza72br@gmail.com",
            role=UserRole.EMPRESA_ADMIN,
        )

        self.cliente_gerente = User.objects.create_user(
            username="cliente_icb",
            email="workspace.icb@gmail.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente_org,
        )


    def test_cliente_pode_consultar_dados_publicos_para_inscricao(self):
        self.client.force_authenticate(user=self.cliente_gerente)
        resp = self.client.get("/api/v1/schedule/configuracao/diagnostico/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "calendar_id" in data
        assert "google_subscribe_url" in data
        # Dados internos de infraestrutura não devem ser expostos para clientes
        assert data.get("service_account_email") is None

    def test_admin_empresa_recebe_diagnostico_completo(self):
        self.client.force_authenticate(user=self.admin_empresa)
        resp = self.client.get("/api/v1/schedule/configuracao/diagnostico/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "calendar_id" in data
        assert "modo_operacao" in data
        assert "service_account_configurada" in data

    def test_cliente_bloqueado_ao_tentar_alterar_calendar_id(self):
        self.client.force_authenticate(user=self.cliente_gerente)
        resp = self.client.patch(
            "/api/v1/schedule/configuracao/diagnostico/",
            {"calendar_id": "novo-id@group.calendar.google.com"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_empresa_altera_calendar_id_com_sucesso(self):
        self.client.force_authenticate(user=self.admin_empresa)
        resp = self.client.patch(
            "/api/v1/schedule/configuracao/diagnostico/",
            {"calendar_id": "agenda-nova@group.calendar.google.com"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["calendar_id"] == "agenda-nova@group.calendar.google.com"

        # Verificar persistência
        config = ConfiguracaoSchedule.get_solo()
        assert config.calendar_id == "agenda-nova@group.calendar.google.com"
        assert config.atualizado_por == self.admin_empresa

    def test_cliente_bloqueado_ao_tentar_testar_conexao(self):
        self.client.force_authenticate(user=self.cliente_gerente)
        resp = self.client.post("/api/v1/schedule/configuracao/testar-conexao/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_empresa_executa_teste_conexao(self):
        self.client.force_authenticate(user=self.admin_empresa)
        resp = self.client.post("/api/v1/schedule/configuracao/testar-conexao/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert "sucesso" in data
        assert "latencia_ms" in data
