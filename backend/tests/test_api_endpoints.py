import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato
from apps.pedidos.models import Pedido, StatusPedido, PrioridadePedido
from apps.ciclos.models import Ciclo, StatusCiclo, TipoCiclo
from apps.ciclos.services import CicloService

@pytest.mark.django_db
class TestApiEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin_api",
            password="password123",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Acme API Corp",
            cnpj="11222333000100",
            email_contato="api@acme.com",
        )
        self.gerente_cliente = User.objects.create_user(
            username="gerente_api",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        self.contrato = Contrato.objects.create(
            numero="CT-2026-9001",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

    def test_jwt_auth_e_me_endpoint(self):
        # 1. Login com credenciais válidas
        res = self.client.post("/api/v1/auth/token/", {"username": "admin_api", "password": "password123"})
        assert res.status_code == 200
        access_token = res.data["access"]
        assert access_token is not None

        # 2. Acesso ao endpoint Me
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        res_me = self.client.get("/api/v1/auth/me/")
        assert res_me.status_code == 200
        assert res_me.data["username"] == "admin_api"
        assert res_me.data["role"] == "EMPRESA_ADMIN"

    def test_magic_link_publico_sem_login(self):
        pedido = Pedido.objects.create(
            protocolo="OS2026089001",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda pública",
            descricao="Teste de aprovação via link mágico",
            prioridade=PrioridadePedido.MEDIA,
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.ANALISE,
            operador=self.admin,
            horas_estimadas=Decimal("5.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )

        # Acessa sem token de autenticação
        client_publico = APIClient()
        res = client_publico.get(f"/api/v1/ciclos/publico/{ciclo.token_acesso}/")
        assert res.status_code == 200
        assert res.data["pedido_protocolo"] == "OS2026089001"
        assert res.data["ciclo"]["status"] == "aguardando_aprovacao"

        # Aprova orçamento via Magic Link
        res_action = client_publico.post(
            f"/api/v1/ciclos/publico/{ciclo.token_acesso}/",
            {"acao": "aprovar"},
        )
        assert res_action.status_code == 200
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.APROVADO

    def test_criar_pedido_por_empresa_e_cliente(self):
        from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline

        # 1. Cria pedido com protocolo irregular pré-existente
        Pedido.objects.create(
            protocolo="OS202608MKT01",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Existente",
            descricao="Desc",
            criado_por=self.admin,
        )

        Notification.objects.all().delete()
        TimelineEvent.objects.all().delete()

        # 2. Cliente cria novo pedido
        self.client.force_authenticate(user=self.gerente_cliente)
        res_cli = self.client.post("/api/v1/pedidos/", {
            "contrato": self.contrato.id,
            "assunto": "Erro ao emitir relatório",
            "descricao": "Detalhes do erro do cliente",
            "prioridade": "alta",
        })
        assert res_cli.status_code == 201
        prefixo_esperado = f"OS{timezone.localdate().strftime('%Y%m')}"
        assert res_cli.data["protocolo"].startswith(prefixo_esperado)
        assert res_cli.data["cliente"] == self.cliente.id
        assert res_cli.data["assunto"] == "Erro ao emitir relatório"

        # Notificação enviada para a Empresa (admin), mas não para o autor (gerente_cliente)
        notifs_admin = Notification.objects.filter(usuario=self.admin)
        notifs_autor = Notification.objects.filter(usuario=self.gerente_cliente)
        assert notifs_admin.exists()
        assert not notifs_autor.exists()
        assert "Erro ao emitir relatório" in notifs_admin.first().mensagem or "Novo Pedido" in notifs_admin.first().titulo

        # Timeline event registrado
        timeline_events = TimelineEvent.objects.filter(pedido_id=res_cli.data["id"], tipo=TipoEventoTimeline.PEDIDO_CRIADO)
        assert timeline_events.exists()

        # 3. Empresa cria novo pedido
        Notification.objects.all().delete()
        self.client.force_authenticate(user=self.admin)
        res_adm = self.client.post("/api/v1/pedidos/", {
            "contrato": self.contrato.id,
            "assunto": "Abertura interna pelo suporte",
            "descricao": "Demanda originada internamente",
            "prioridade": "media",
        })
        assert res_adm.status_code == 201
        assert res_adm.data["protocolo"].startswith(prefixo_esperado)
        assert res_adm.data["cliente"] == self.cliente.id
        assert res_adm.data["protocolo"] != res_cli.data["protocolo"]

        # Notificação enviada para o Cliente (gerente_cliente), mas não para o autor (admin)
        notifs_cliente = Notification.objects.filter(usuario=self.gerente_cliente)
        notifs_autor_adm = Notification.objects.filter(usuario=self.admin)
        assert notifs_cliente.exists()
        assert not notifs_autor_adm.exists()

    def test_permissao_aprovacao_orcamento_somente_cliente_gerente(self):
        # Cria técnico da empresa
        tecnico = User.objects.create_user(
            username="tecnico_api",
            password="password123",
            role=UserRole.EMPRESA_TECNICO,
        )
        # Cria analista do cliente
        analista_cliente = User.objects.create_user(
            username="analista_api",
            password="password123",
            role=UserRole.CLIENTE_ANALISTA,
            cliente=self.cliente,
        )
        # Pedido e Ciclo aguardando aprovação
        pedido = Pedido.objects.create(
            protocolo="OS2026087777",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Teste de permissão de aprovação",
            descricao="Verificando se técnico e analista são bloqueados",
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.ANALISE,
            operador=tecnico,
            horas_estimadas=Decimal("4.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )

        # 1. Técnico da empresa tenta aprovar -> Bloqueado (403)
        self.client.force_authenticate(user=tecnico)
        res_tec = self.client.post(f"/api/v1/ciclos/{ciclo.id}/aprovar/")
        assert res_tec.status_code == 403

        # 2. Analista do cliente tenta aprovar -> Bloqueado (403)
        self.client.force_authenticate(user=analista_cliente)
        res_ana = self.client.post(f"/api/v1/ciclos/{ciclo.id}/aprovar/")
        assert res_ana.status_code == 403

        # 3. Gerente do cliente aprova -> Permitido (200)
        self.client.force_authenticate(user=self.gerente_cliente)
        res_ger = self.client.post(f"/api/v1/ciclos/{ciclo.id}/aprovar/")
        assert res_ger.status_code == 200
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.APROVADO

    def test_magic_link_expiracao_7_dias(self):
        from datetime import timedelta
        from apps.ciclos.models import CicloMagicLink, TipoAcaoMagicLink

        pedido = Pedido.objects.create(
            protocolo="OS202608EXP01",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Teste de Expiração de 7 dias",
            descricao="Verificação de bloqueio por expiração",
            prioridade=PrioridadePedido.MEDIA,
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.ANALISE,
            operador=self.admin,
            horas_estimadas=Decimal("6.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )
        magic_link = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.APROVACAO_ORCAMENTO)

        # Força expiração do token (8 dias no passado)
        magic_link.expira_em = timezone.now() - timedelta(days=8)
        magic_link.save()

        client_publico = APIClient()
        res_get = client_publico.get(f"/api/v1/ciclos/publico/{magic_link.token}/")
        assert res_get.status_code == 200
        assert res_get.data["expirado"] is True

        res_post = client_publico.post(
            f"/api/v1/ciclos/publico/{magic_link.token}/",
            {"acao": "aprovar"},
        )
        assert res_post.status_code == 410
        assert "expirou" in res_post.data["detail"]

    def test_magic_link_single_use_e_idempotencia(self):
        from apps.ciclos.models import TipoAcaoMagicLink

        pedido = Pedido.objects.create(
            protocolo="OS202608SGL01",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Teste de Uso Único",
            descricao="Verificação de Idempotência e Single-Use",
            prioridade=PrioridadePedido.BAIXA,
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.CORRETIVA,
            operador=self.admin,
            horas_estimadas=Decimal("4.50"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )
        magic_link = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.APROVACAO_ORCAMENTO)

        client_publico = APIClient()

        # 1º Uso -> Sucesso (200)
        res1 = client_publico.post(
            f"/api/v1/ciclos/publico/{magic_link.token}/",
            {"acao": "aprovar"},
            REMOTE_ADDR="192.168.1.100",
            HTTP_USER_AGENT="TestClient/1.0",
        )
        assert res1.status_code == 200
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.APROVADO

        magic_link.refresh_from_db()
        assert magic_link.usado is True
        assert magic_link.usado_em is not None
        assert magic_link.usado_ip == "192.168.1.100"

        # 2º Uso -> Bloqueio de Idempotência (409 Conflict)
        res2 = client_publico.post(
            f"/api/v1/ciclos/publico/{magic_link.token}/",
            {"acao": "aprovar"},
        )
        assert res2.status_code == 409
        assert "já foi consumido" in res2.data["detail"] or "já foi utilizado" in res2.data["detail"]

    def test_magic_link_bloqueia_rejeicao_e_recusa_publica(self):
        from apps.ciclos.models import TipoAcaoMagicLink

        pedido = Pedido.objects.create(
            protocolo="OS202608BLK01",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Teste de Bloqueio de Rejeição Pública",
            descricao="Rejeição deve ser exclusiva via App com justificativa",
            prioridade=PrioridadePedido.ALTA,
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.EVOLUTIVA,
            operador=self.admin,
            horas_estimadas=Decimal("12.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )
        magic_link = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.APROVACAO_ORCAMENTO)

        client_publico = APIClient()

        # Tentativa de rejeitar via Magic Link -> 403 Forbidden
        res_rej = client_publico.post(
            f"/api/v1/ciclos/publico/{magic_link.token}/",
            {"acao": "rejeitar"},
        )
        assert res_rej.status_code == 403
        assert "Operação não permitida via Magic Link" in res_rej.data["detail"]

        # Tentativa de recusar via Magic Link -> 403 Forbidden
        res_rec = client_publico.post(
            f"/api/v1/ciclos/publico/{magic_link.token}/",
            {"acao": "recusar"},
        )
        assert res_rec.status_code == 403

    def test_auditoria_forense_e_debito_ledger_no_aceite_final(self):
        from apps.ciclos.models import TipoAcaoMagicLink
        from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
        from apps.notificacoes.models import TimelineEvent, TipoEventoTimeline

        pedido = Pedido.objects.create(
            protocolo="OS202608AUD01",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda de Auditoria Forense Completa",
            descricao="Validação de IP, User-Agent e carimbo ISO 8601",
            prioridade=PrioridadePedido.URGENTE,
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.CONSULTORIA,
            operador=self.admin,
            horas_estimadas=Decimal("15.00"),
            horas_realizadas=Decimal("14.00"),
            status=StatusCiclo.AGUARDANDO_ACEITE,
        )
        magic_link = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.ACEITE_CICLO)

        client_publico = APIClient()
        ip_teste = "198.51.100.77"
        ua_teste = "Mozilla/5.0 (ComplianceAuditor/2.0)"

        res = client_publico.post(
            f"/api/v1/ciclos/publico/{magic_link.token}/",
            {"acao": "aceitar"},
            REMOTE_ADDR=ip_teste,
            HTTP_USER_AGENT=ua_teste,
        )
        assert res.status_code == 200

        # 1. Valida Ciclo
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.ACEITO
        assert ciclo.aceito_ip == ip_teste
        assert ciclo.aceito_user_agent == ua_teste
        assert ciclo.aceito_metodo == "MAGIC_LINK"
        assert ciclo.aceito_em is not None

        # 2. Valida Débito no Contrato e Histórico de Saldo (Ledger)
        self.contrato.refresh_from_db()
        assert self.contrato.saldo == Decimal("36.00")  # 50.00 - 14.00 = 36.00h
        assert self.contrato.horas_consumidas == Decimal("14.00")

        historico = HistoricoSaldo.objects.filter(ciclo=ciclo, tipo_operacao=TipoOperacaoSaldo.CONSUMO).first()
        assert historico is not None
        assert historico.quantidade == Decimal("-14.00")
        assert historico.saldo_resultante == Decimal("36.00")
        assert historico.ip_origem == ip_teste
        assert historico.user_agent == ua_teste
        assert historico.metodo_aprovacao == "MAGIC_LINK"

        # 3. Valida TimelineEvent
        timeline_event = TimelineEvent.objects.filter(ciclo=ciclo, tipo=TipoEventoTimeline.CICLO_ACEITO).first()
        assert timeline_event is not None
        assert timeline_event.ip_origem == ip_teste
        assert timeline_event.user_agent == ua_teste

    def test_status_endpoint_retorna_versao_2_6_0(self):
        client = APIClient()
        res = client.get("/api/v1/status/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["service"] == "SHM 2.6 Branding"
        assert data["version"] == "2.6.0"
        assert "2.6 Branding" in data["release"]