import os
import pytest
from decimal import Decimal
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    ContratoEmailNotificacao,
    StatusConfirmacaoEmail,
    ExtratoOficialGerado,
    ContratoAuditLog,
    TipoEventoContratoAudit,
)
from apps.contratos.pdf_service import ExtratoPdfService
from apps.pedidos.models import Pedido
from apps.ciclos.models import Ciclo, StatusCiclo


@pytest.fixture
def usuario_admin(db):
    return User.objects.create_superuser(
        username="admin_extrato",
        email="admin@shm.com",
        password="password123",
        role=UserRole.EMPRESA_ADMIN,
    )


@pytest.fixture
def cliente_a(db):
    return Cliente.objects.create(
        razao_social="Empresa Alfa Tecnologia Ltda",
        nome_fantasia="Alfa Tech",
        cnpj="11222333000181",
        email_contato="contato@alfatech.com",
    )


@pytest.fixture
def cliente_b(db):
    return Cliente.objects.create(
        razao_social="Empresa Beta Servicos SA",
        nome_fantasia="Beta Servicos",
        cnpj="44555666000199",
        email_contato="contato@betaservicos.com",
    )


@pytest.fixture
def usuario_gerente_alfa(db, cliente_a):
    return User.objects.create_user(
        username="gerente_alfa",
        email="gerente@alfatech.com",
        password="password123",
        role=UserRole.CLIENTE_GERENTE,
        cliente=cliente_a,
    )


@pytest.fixture
def usuario_gerente_beta(db, cliente_b):
    return User.objects.create_user(
        username="gerente_beta",
        email="gerente@betaservicos.com",
        password="password123",
        role=UserRole.CLIENTE_GERENTE,
        cliente=cliente_b,
    )


@pytest.fixture
def contrato_alfa(db, cliente_a, usuario_admin):
    return Contrato.objects.create(
        numero="CT-2026-ALFA01",
        status=StatusContrato.ATIVO,
        cliente=cliente_a,
        gestor_nome="Carlos Silva",
        gestor_email="gerente@alfatech.com",
        horas_contratadas=Decimal("80.00"),
        saldo=Decimal("65.00"),
        horas_consumidas=Decimal("15.00"),
        data_inicio="2026-01-01",
        criado_por=usuario_admin,
    )


@pytest.fixture
def ciclo_homologado(db, contrato_alfa, cliente_a, usuario_admin):
    pedido = Pedido.objects.create(
        protocolo="PED-2026-ALFA01",
        cliente=cliente_a,
        contrato=contrato_alfa,
        assunto="Suporte Banco de Dados",
        descricao="Otimização de índices e queries",
    )
    return Ciclo.objects.create(
        pedido=pedido,
        operador=usuario_admin,
        status=StatusCiclo.ACEITO,
        horas_estimadas=Decimal("15.00"),
        horas_realizadas=Decimal("15.00"),
        contexto="Otimização concluída e homologada",
        aceito_em=timezone.now(),
    )


@pytest.mark.django_db
def test_compilacao_extrato_pdf_e_hash_sha256(contrato_alfa, ciclo_homologado, usuario_admin):
    pdf_bytes, extrato_reg, nome_arquivo = ExtratoPdfService.gerar_extrato_pdf(
        contrato=contrato_alfa,
        origem="manual_download",
        usuario=usuario_admin,
        salvar=True,
    )

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 2000  # Garante que não é o stub de página em branco de 329 bytes
    assert pdf_bytes.startswith(b"%PDF")
    assert b"/Contents" in pdf_bytes  # Garante que há fluxo de renderização visível
    assert extrato_reg is not None
    assert len(extrato_reg.hash_sha256) == 64
    assert extrato_reg.quantidade_ciclos >= 1
    assert extrato_reg.horas_consumidas == Decimal("15.00")
    assert extrato_reg.saldo_disponivel == Decimal("65.00")

    # Verifica se o log de auditoria foi gravado
    audit = ContratoAuditLog.objects.filter(
        contrato=contrato_alfa,
        tipo_evento=TipoEventoContratoAudit.DOWNLOAD_RELATORIO,
    ).first()
    assert audit is not None
    assert audit.documento_hash == extrato_reg.hash_sha256


@pytest.mark.django_db
def test_compilacao_extrato_pdf_com_acentos_e_conteudo_valido(usuario_admin):
    """
    Testa dados com rica acentuação em língua portuguesa ('Brasília', 'Manutenção Preventiva', 'às')
    garantindo que o compilador não quebre e produza um documento PDF estruturado com conteúdo real.
    """
    cliente_brasilia = Cliente.objects.create(
        razao_social="Iate Clube de Brasília",
        nome_fantasia="Iate Brasília",
        cnpj="12345678000195",
        email_contato="gestao@iatebrasilia.com.br",
    )
    contrato_brasilia = Contrato.objects.create(
        numero="CT-2026-BSB01",
        status=StatusContrato.ATIVO,
        cliente=cliente_brasilia,
        gestor_nome="Vanderlina de Souza e Silva",
        gestor_email="gestao@iatebrasilia.com.br",
        horas_contratadas=Decimal("100.00"),
        saldo=Decimal("70.00"),
        horas_consumidas=Decimal("30.00"),
        data_inicio="2026-01-01",
        criado_por=usuario_admin,
    )
    pedido = Pedido.objects.create(
        protocolo="PED-2026-BSB01",
        cliente=cliente_brasilia,
        contrato=contrato_brasilia,
        assunto="Manutenção Corretiva & Evolutiva do Portal",
        descricao="Correção de emissão de boletos bancários e relatórios",
    )
    Ciclo.objects.create(
        pedido=pedido,
        operador=usuario_admin,
        status=StatusCiclo.ACEITO,
        tipo="Manutenção Preventiva e Evolutiva",
        horas_estimadas=Decimal("30.00"),
        horas_realizadas=Decimal("30.00"),
        contexto="Homologação final concedida pela gerência às 14:30",
        aceito_em=timezone.now(),
    )

    pdf_bytes, extrato_reg, nome_arquivo = ExtratoPdfService.gerar_extrato_pdf(
        contrato=contrato_brasilia,
        origem="manual_download",
        usuario=usuario_admin,
        salvar=True,
    )

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")
    assert b"/Contents" in pdf_bytes
    assert extrato_reg is not None
    assert len(extrato_reg.hash_sha256) == 64
    assert extrato_reg.quantidade_ciclos == 1


@pytest.mark.django_db
def test_endpoint_download_extrato_pdf(contrato_alfa, usuario_admin):
    api_client = APIClient()
    api_client.force_authenticate(user=usuario_admin)
    response = api_client.get(f"/api/v1/contratos/{contrato_alfa.id}/extrato_pdf/")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert "attachment; filename=" in response["Content-Disposition"]
    assert response.has_header("X-SHA256-Checksum")
    assert len(response["X-SHA256-Checksum"]) == 64


@pytest.mark.django_db
def test_endpoint_extrato_pdf_permissao_negada(contrato_alfa, usuario_gerente_beta):
    # Gerente de outro cliente não pode baixar extrato do contrato alfa
    api_client = APIClient()
    api_client.force_authenticate(user=usuario_gerente_beta)
    response = api_client.get(f"/api/v1/contratos/{contrato_alfa.id}/extrato_pdf/")

    assert response.status_code in (403, 404)


@pytest.mark.django_db
def test_endpoint_destinatarios_extrato(contrato_alfa, usuario_admin):
    ContratoEmailNotificacao.objects.create(
        contrato=contrato_alfa,
        email="diretoria@alfatech.com",
        nome="Diretoria Alfa",
        status=StatusConfirmacaoEmail.CONFIRMADO,
        expira_em=timezone.now() + timezone.timedelta(days=15),
    )
    ContratoEmailNotificacao.objects.create(
        contrato=contrato_alfa,
        email="pendente@alfatech.com",
        nome="Contato Pendente",
        status=StatusConfirmacaoEmail.PENDENTE,
        expira_em=timezone.now() + timezone.timedelta(days=15),
    )

    api_client = APIClient()
    api_client.force_authenticate(user=usuario_admin)
    response = api_client.get(f"/api/v1/contratos/{contrato_alfa.id}/destinatarios_extrato/")

    assert response.status_code == 200
    data = response.json()
    assert data["gestor"]["email"] == "gerente@alfatech.com"
    # Apenas o confirmado deve estar na lista (o pendente fica de fora)
    emails = [d["email"] for d in data["destinatarios"]]
    assert "diretoria@alfatech.com" in emails
    assert "pendente@alfatech.com" not in emails


@pytest.mark.django_db
def test_endpoint_enviar_extrato_email(contrato_alfa, usuario_admin):
    api_client = APIClient()
    api_client.force_authenticate(user=usuario_admin)
    payload = {
        "destinatarios": ["financeiro@alfatech.com"],
        "mensagem_adicional": "Segue prestação de contas deste mês.",
    }
    response = api_client.post(
        f"/api/v1/contratos/{contrato_alfa.id}/enviar_extrato_email/",
        data=payload,
        format="json",
    )

    assert response.status_code == 200
    data = response.json()
    assert data["sucesso"] is True
    assert "financeiro@alfatech.com" in data["destinatarios_enviados"]

    # Verifica registro de auditoria
    audit = ContratoAuditLog.objects.filter(
        contrato=contrato_alfa,
        tipo_evento=TipoEventoContratoAudit.ENVIO_RELATORIO,
    ).first()
    assert audit is not None


@pytest.mark.django_db
def test_comando_enviar_extratos_mensais(contrato_alfa, ciclo_homologado):
    agora = timezone.now()
    call_command(
        "enviar_extratos_mensais",
        mes=agora.month,
        ano=agora.year,
        contrato_id=contrato_alfa.id,
        forcar=True,
    )

    extrato = ExtratoOficialGerado.objects.filter(contrato=contrato_alfa).first()
    assert extrato is not None
    assert extrato.origem == "mensal_automatico"


@pytest.mark.django_db
def test_raio_x_demandas_em_andamento_e_projecao_saldo(contrato_alfa, cliente_a, usuario_admin):
    from apps.contratos.services import ContratoService
    from apps.pedidos.models import Pedido, StatusPedido
    from apps.ciclos.models import Ciclo, StatusCiclo

    # Contrato Alfa tem saldo = 65.00h
    # 1. Demanda aguardando aceite de orçamento (A2)
    p_orc = Pedido.objects.create(
        protocolo="PED-ORC-001",
        cliente=cliente_a,
        contrato=contrato_alfa,
        assunto="Orçamento de Nova Feature",
        status=StatusPedido.AGUARDANDO_APROVACAO,
    )
    Ciclo.objects.create(
        pedido=p_orc,
        tipo="evolutiva",
        contexto="Desenvolvimento de API",
        operador=usuario_admin,
        status=StatusCiclo.AGUARDANDO_APROVACAO,
        horas_estimadas=Decimal("10.00"),
        horas_realizadas=Decimal("0.00"),
    )

    # 2. Demanda em execução técnica
    p_exec = Pedido.objects.create(
        protocolo="PED-EXEC-002",
        cliente=cliente_a,
        contrato=contrato_alfa,
        assunto="Refatoração de Módulo",
        status=StatusPedido.EM_EXECUCAO,
    )
    Ciclo.objects.create(
        pedido=p_exec,
        tipo="corretiva",
        contexto="Refatoração de banco",
        operador=usuario_admin,
        status=StatusCiclo.EM_EXECUCAO,
        horas_estimadas=Decimal("15.00"),
        horas_realizadas=Decimal("0.00"),
    )

    # 3. Demanda aguardando aceite final de entrega (A3)
    p_ent = Pedido.objects.create(
        protocolo="PED-ENT-003",
        cliente=cliente_a,
        contrato=contrato_alfa,
        assunto="Entrega de Relatórios",
        status=StatusPedido.AGUARDANDO_ACEITE,
    )
    Ciclo.objects.create(
        pedido=p_ent,
        tipo="analise",
        contexto="Auditoria concluída",
        operador=usuario_admin,
        status=StatusCiclo.AGUARDANDO_ACEITE,
        horas_estimadas=Decimal("8.00"),
        horas_realizadas=Decimal("8.00"),
    )

    dados = ContratoService.obter_dados_extrato(contrato_alfa)
    proj = dados["projecao_saldo"]
    dem = dados["demandas_em_andamento"]

    assert proj["saldo_atual"] == 65.0
    assert proj["horas_pendentes_orcamento"] == 10.0
    assert proj["horas_em_execucao"] == 15.0
    assert proj["horas_pendentes_entrega"] == 8.0
    assert proj["total_horas_comprometidas"] == 33.0
    # Saldo projetado = 65.0 - 33.0 = 32.0h
    assert proj["saldo_projetado"] == 32.0
    assert proj["previsao_estouro"] is False
    assert proj["horas_estouro"] == 0.0

    assert dem["total_demandas"] == 3
    assert len(dem["aguardando_orcamento"]) == 1
    assert len(dem["em_execucao"]) == 1
    assert len(dem["aguardando_entrega"]) == 1
    # Verifica apuração do responsável pela ação no fluxo (gestor do cliente vs técnico)
    assert dem["aguardando_orcamento"][0]["responsavel_nome"] == "Carlos Silva"
    assert dem["aguardando_orcamento"][0]["responsavel_papel"] == "cliente"
    assert dem["em_execucao"][0]["responsavel_papel"] == "tecnico"
    assert dem["aguardando_entrega"][0]["responsavel_nome"] == "Carlos Silva"
    assert dem["aguardando_entrega"][0]["responsavel_papel"] == "cliente"

    # Testa endpoint GET /api/v1/contratos/{id}/extrato/
    api_client = APIClient()
    api_client.force_authenticate(user=usuario_admin)
    resp = api_client.get(f"/api/v1/contratos/{contrato_alfa.id}/extrato/")
    assert resp.status_code == 200
    res_data = resp.json()
    assert "projecao_saldo" in res_data
    assert res_data["projecao_saldo"]["saldo_projetado"] == 32.0
    assert "demandas_em_andamento" in res_data

    # Testa geração do PDF com Raio-X
    pdf_bytes, extrato_reg, nome = ExtratoPdfService.gerar_extrato_pdf(contrato_alfa, salvar=False)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


@pytest.mark.django_db
def test_projecao_saldo_com_estouro_de_franquia(contrato_alfa, cliente_a, usuario_admin):
    from apps.contratos.services import ContratoService
    from apps.pedidos.models import Pedido, StatusPedido
    from apps.ciclos.models import Ciclo, StatusCiclo

    # Saldo atual = 65.0h. Criamos demanda com 80.0h em execução -> Estouro de 15.0h
    p_estouro = Pedido.objects.create(
        protocolo="PED-ESTOURO-999",
        cliente=cliente_a,
        contrato=contrato_alfa,
        assunto="Projeto Grande",
        status=StatusPedido.EM_EXECUCAO,
    )
    Ciclo.objects.create(
        pedido=p_estouro,
        tipo="evolutiva",
        contexto="Desenvolvimento grande",
        operador=usuario_admin,
        status=StatusCiclo.EM_EXECUCAO,
        horas_estimadas=Decimal("80.00"),
        horas_realizadas=Decimal("0.00"),
    )

    dados = ContratoService.obter_dados_extrato(contrato_alfa)
    proj = dados["projecao_saldo"]

    assert proj["saldo_atual"] == 65.0
    assert proj["total_horas_comprometidas"] == 80.0
    assert proj["saldo_projetado"] == -15.0
    assert proj["previsao_estouro"] is True
    assert proj["horas_estouro"] == 15.0

    # Compilar PDF e verificar alerta de estouro sem erro
    pdf_bytes, _, _ = ExtratoPdfService.gerar_extrato_pdf(contrato_alfa, salvar=False)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")
