import uuid
from decimal import Decimal
import pytest
from django.db import connection
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import (
    AuditDailySeal,
    Contrato,
    ForensicAuditLog,
    NivelRelevanciaAudit,
    StatusContrato,
    TipoContrato,
)
from apps.contratos.forensic_service import ForensicAuditService


@pytest.fixture
def usuario_admin(db):
    return User.objects.create_user(
        username=f"admin_{uuid.uuid4().hex[:6]}",
        email="admin@forense.com",
        password="password123",
        role=UserRole.EMPRESA_ADMIN,
    )


@pytest.fixture
def cliente_teste(db):
    return Cliente.objects.create(
        razao_social="Perícia e Auditoria LTDA",
        nome_fantasia="Perícia Forense",
        cnpj="11.222.333/0001-44",
        email_contato="pericia@empresa.com",
        tipo=TipoCliente.PJ,
    )


@pytest.fixture
def contrato_teste(db, cliente_teste, usuario_admin):
    return Contrato.objects.create(
        cliente=cliente_teste,
        numero=f"CT-VERIF-{uuid.uuid4().hex[:6].upper()}",
        status=StatusContrato.ATIVO,
        tipo=TipoContrato.NOVO,
        horas_contratadas=Decimal("100.00"),
        valor_mensal=Decimal("15000.00"),
        data_inicio=timezone.localdate(),
        data_termino=timezone.localdate() + timezone.timedelta(days=365),
        criado_por=usuario_admin,
    )


@pytest.mark.django_db
def test_verifier_success_intact_chain(contrato_teste):
    """Verifica se a corrente íntegra de 5 registros é pericialmente aprovada com 100% de sucesso."""
    particao = f"contrato:{contrato_teste.id}"

    logs = []
    for i in range(1, 6):
        log = ForensicAuditService.registrar_evento(
            tipo_evento=f"EVENTO_TESTE_{i}",
            descricao=f"Descrição pericial {i}",
            nivel_relevancia=NivelRelevanciaAudit.N1,
            contrato=contrato_teste,
            justificativa="Justificativa técnica detalhada e válida",
            dados_payload={"indice": i, "valor": Decimal(f"{i * 10}.50")},
        )
        logs.append(log)

    resultado = ForensicAuditService.verificar_integridade_particao(particao)

    assert resultado["status"] == "integro"
    assert resultado["total_registros_verificados"] == 5
    assert resultado["ultimo_hash"] == logs[-1].current_hash
    assert "100% íntegra" in resultado["mensagem"]
    assert "tempo_verificacao_ms" in resultado


@pytest.mark.django_db
def test_verifier_detects_tampered_payload(contrato_teste):
    """
    Garante que uma fraude na carga útil (payload) de um registro intermediário
    é detectada com precisão cirúrgica apontando o registro exato.
    """
    particao = f"contrato:{contrato_teste.id}"

    log1 = ForensicAuditService.registrar_evento(
        tipo_evento="CRIACAO",
        descricao="Criação pericial",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa do primeiro elo",
        dados_payload={"horas": Decimal("10.00")},
    )

    log2 = ForensicAuditService.registrar_evento(
        tipo_evento="DEBITO",
        descricao="Débito de horas",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa do segundo elo",
        dados_payload={"horas": Decimal("5.00")},
    )

    log3 = ForensicAuditService.registrar_evento(
        tipo_evento="CONCLUSAO",
        descricao="Conclusão da tarefa",
        nivel_relevancia=NivelRelevanciaAudit.N2,
        contrato=contrato_teste,
    )

    # Adulteração direta via SQL no log2 (alterando o JSON sem atualizar o hash)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE shm_forensic_audit_trail
            SET dados_payload = '{"horas": "999.00"}'
            WHERE particao = %s AND sequencia = 2
            """,
            [particao],
        )

    resultado = ForensicAuditService.verificar_integridade_particao(particao)

    assert resultado["status"] == "rompido"
    assert resultado["registro_falha_sequencia"] == 2
    assert resultado["registro_falha_id"] == str(log2.id)
    assert "adulterada" in resultado["mensagem"]


@pytest.mark.django_db
def test_verifier_detects_broken_chain_previous_hash(contrato_teste):
    """Garante que a quebra de enlace entre elos vizinhos é imediatamente identificada."""
    particao = f"contrato:{contrato_teste.id}"

    log1 = ForensicAuditService.registrar_evento(
        tipo_evento="EVENTO_1",
        descricao="Primeiro evento",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa do primeiro elo",
    )

    log2 = ForensicAuditService.registrar_evento(
        tipo_evento="EVENTO_2",
        descricao="Segundo evento",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa do segundo elo",
    )

    log3 = ForensicAuditService.registrar_evento(
        tipo_evento="EVENTO_3",
        descricao="Terceiro evento",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa do terceiro elo",
    )

    # Violação de enlace: altera previous_hash do log3 diretamente no banco
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE shm_forensic_audit_trail
            SET previous_hash = CASE WHEN SUBSTR(previous_hash, 1, 1) = 'f' THEN '0' || SUBSTR(previous_hash, 2) ELSE 'f' || SUBSTR(previous_hash, 2) END
            WHERE particao = %s AND sequencia = 3
            """,
            [particao],
        )

    resultado = ForensicAuditService.verificar_integridade_particao(particao)

    assert resultado["status"] == "rompido"
    assert resultado["registro_falha_sequencia"] == 3
    assert resultado["registro_falha_id"] == str(log3.id)
    assert "incompatível" in resultado["mensagem"]


@pytest.mark.django_db
def test_verifier_empty_partition():
    """Garante resposta íntegra para partição ainda sem eventos registrados."""
    resultado = ForensicAuditService.verificar_integridade_particao("particao_inexistente_123")
    assert resultado["status"] == "integro"
    assert resultado["total_registros_verificados"] == 0
    assert resultado["ultimo_hash"] is None


@pytest.mark.django_db
def test_daily_seal_generation_and_persistence(contrato_teste):
    """Verifica a lavratura do selo pericial diário (Daily Seal) consolidado."""
    particao = f"contrato:{contrato_teste.id}"

    log = ForensicAuditService.registrar_evento(
        tipo_evento="EVENTO_SELO",
        descricao="Evento para teste de selo",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa para fechamento pericial",
    )

    hoje = timezone.localdate()
    selo = ForensicAuditService.selar_particao_diaria(particao, data_referencia=hoje)

    assert selo is not None
    assert selo.particao == particao
    assert selo.data_referencia == hoje
    assert selo.ultimo_registro_id == log.id
    assert selo.ultima_sequencia == 1
    assert selo.ultimo_hash == log.current_hash
    assert selo.total_eventos_dia >= 1
    assert len(selo.selo_digest) == 64

    # Idempotência: rodar novamente atualiza o selo existente sem duplicidade
    selo_novamente = ForensicAuditService.selar_particao_diaria(particao, data_referencia=hoje)
    assert selo_novamente.id == selo.id
    assert AuditDailySeal.objects.filter(particao=particao, data_referencia=hoje).count() == 1


@pytest.mark.django_db
def test_cliente_exclusao_forensic_integrity_preserved():
    """Garante que a exclusão física de um cliente mantém a trilha forense íntegra e verificável."""
    from apps.clientes.models import Cliente, TipoCliente, StatusCliente
    from apps.clientes.services import ClienteService

    cliente = Cliente.objects.create(
        tipo=TipoCliente.PJ,
        razao_social="Audit Client Test Ltda",
        nome_fantasia="Audit Test",
        cnpj="11222333000199",
        email_contato="audit@test.com.br",
        status=StatusCliente.ATIVO,
    )
    cliente_id = cliente.id
    particao = f"cliente:{cliente_id}"

    ClienteService.excluir_cliente(
        cliente=cliente,
        justificativa="Cliente solicitou encerramento definitivo com trilha pericial.",
    )

    assert not Cliente.objects.filter(id=cliente_id).exists()

    resultado = ForensicAuditService.verificar_integridade_particao(particao)
    assert resultado["status"] == "integro"
    assert resultado["total_registros_verificados"] == 1
    assert resultado["ultimo_hash"] is not None
    assert len(resultado["ultimo_hash"]) == 64

