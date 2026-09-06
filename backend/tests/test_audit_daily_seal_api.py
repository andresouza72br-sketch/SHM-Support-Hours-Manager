import uuid
from decimal import Decimal
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato, TipoContrato, AuditDailySeal
from apps.contratos.forensic_service import ForensicAuditService


@pytest.fixture
def usuario_admin(db):
    return User.objects.create_user(
        username=f"admin_{uuid.uuid4().hex[:6]}",
        email="admin_auditoria@shm.com",
        password="password123",
        role=UserRole.EMPRESA_ADMIN,
    )


@pytest.fixture
def usuario_cliente(db):
    return User.objects.create_user(
        username=f"cliente_{uuid.uuid4().hex[:6]}",
        email="cliente_auditoria@shm.com",
        password="password123",
        role=UserRole.CLIENTE_ANALISTA,
    )


@pytest.fixture
def contrato_com_auditoria(db, usuario_admin):
    cliente = Cliente.objects.create(
        razao_social="Auditoria Teste LTDA",
        nome_fantasia="Auditoria Teste",
        cnpj="44.555.666/0001-77",
        email_contato="contato@auditoriateste.com",
        tipo=TipoCliente.PJ,
    )
    contrato = Contrato.objects.create(
        cliente=cliente,
        numero=f"CT-SEAL-{uuid.uuid4().hex[:6].upper()}",
        status=StatusContrato.ATIVO,
        tipo=TipoContrato.NOVO,
        horas_contratadas=Decimal("80.00"),
        valor_mensal=Decimal("12000.00"),
        data_inicio=timezone.localdate(),
        criado_por=usuario_admin,
    )
    ForensicAuditService.registrar_evento(
        tipo_evento="CRIACAO_CONTRATO",
        descricao="Criação pericial de contrato de teste",
        contrato=contrato,
        usuario=usuario_admin,
        justificativa="Justificativa técnica mandatória para teste",
    )
    return contrato


@pytest.mark.django_db
def test_listar_selos_diarios_admin(usuario_admin, contrato_com_auditoria):
    particao = f"contrato:{contrato_com_auditoria.id}"
    hoje = timezone.localdate()
    ForensicAuditService.selar_particao_diaria(particao, data_referencia=hoje)

    client = APIClient()
    client.force_authenticate(user=usuario_admin)

    res = client.get("/api/v1/auditoria/selos_diarios/")
    assert res.status_code == 200
    assert len(res.data) >= 1
    selo = res.data[0]
    assert "selo_digest" in selo
    assert "particao" in selo
    assert "data_referencia" in selo


@pytest.mark.django_db
def test_listar_selos_diarios_filtro_particao(usuario_admin, contrato_com_auditoria):
    particao = f"contrato:{contrato_com_auditoria.id}"
    hoje = timezone.localdate()
    ForensicAuditService.selar_particao_diaria(particao, data_referencia=hoje)

    client = APIClient()
    client.force_authenticate(user=usuario_admin)

    res = client.get(f"/api/v1/auditoria/selos_diarios/?particao={contrato_com_auditoria.id}")
    assert res.status_code == 200
    assert len(res.data) == 1
    assert res.data[0]["particao"] == particao


@pytest.mark.django_db
def test_listar_selos_diarios_negado_cliente(usuario_cliente):
    client = APIClient()
    client.force_authenticate(user=usuario_cliente)

    res = client.get("/api/v1/auditoria/selos_diarios/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_executar_auditoria_diaria_admin(usuario_admin, contrato_com_auditoria):
    client = APIClient()
    client.force_authenticate(user=usuario_admin)

    res = client.post("/api/v1/auditoria/executar_diaria/")
    assert res.status_code == 200
    assert res.data["sucesso"] is True
    assert res.data["selos_gerados"] >= 1
    assert res.data["total_particoes"] >= 1
    assert res.data["particoes_rompidas"] == 0
    assert len(res.data["detalhes"]) >= 1

    particao_res = next(
        (d for d in res.data["detalhes"] if d["particao"] == f"contrato:{contrato_com_auditoria.id}"),
        None,
    )
    assert particao_res is not None
    assert particao_res["status"] == "integro"
    assert particao_res["total_eventos_dia"] >= 1


@pytest.mark.django_db
def test_executar_auditoria_diaria_negado_cliente(usuario_cliente):
    client = APIClient()
    client.force_authenticate(user=usuario_cliente)

    res = client.post("/api/v1/auditoria/executar_diaria/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_auditoria_endpoints_sem_autenticacao():
    client = APIClient()
    res_list = client.get("/api/v1/auditoria/selos_diarios/")
    assert res_list.status_code == 401

    res_exec = client.post("/api/v1/auditoria/executar_diaria/")
    assert res_exec.status_code == 401
