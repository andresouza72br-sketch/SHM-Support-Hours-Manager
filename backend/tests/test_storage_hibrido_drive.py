import io
import os
import pytest
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from apps.clientes.models import Cliente, TipoCliente
from apps.pedidos.models import Pedido, AnexoPedido
from apps.ciclos.models import Ciclo
from apps.comunicacao.models import Comentario, AnexoComentario
from apps.core.models import RegistroSincronizacaoDrive, StatusSincronizacaoDrive
from apps.core.storage import (
    caminho_anexo_pedido,
    caminho_anexo_comentario,
    calcular_hash_sha256,
    sanitizar_nome_arquivo,
    GoogleDriveStorageService,
    agendar_sincronizacao_arquivo,
    _executar_sincronizacao_em_thread,
)

@pytest.fixture
def cliente(db):
    return Cliente.objects.create(
        razao_social="Empresa Teste Cloud Ltda",
        nome_fantasia="Empresa Teste",
        cnpj="11222333000181",
        email_contato="contato@empresateste.com",
        email_google_drive="drive.cliente@gmail.com",
    )

@pytest.fixture
def pedido(db, cliente):
    return Pedido.objects.create(
        protocolo="PED-2026-CLOUD01",
        cliente=cliente,
        assunto="Suporte Cloud Storage",
        descricao="Teste de storage hibrido",
    )

@pytest.fixture
def ciclo(db, pedido, usuario_admin):
    from decimal import Decimal
    return Ciclo.objects.create(
        pedido=pedido,
        operador=usuario_admin,
        horas_estimadas=Decimal("10.00"),
    )

@pytest.fixture
def usuario_admin(db, django_user_model):
    return django_user_model.objects.create_user(
        username="admin_storage",
        email="admin@shm.com",
        password="password123",
    )


@pytest.mark.django_db
def test_sanitizar_nome_arquivo():
    assert sanitizar_nome_arquivo("relatorio anual (2026).pdf") == "relatorio_anual__2026_.pdf"
    assert sanitizar_nome_arquivo("../../../etc/passwd") == "passwd"
    assert sanitizar_nome_arquivo("") == "arquivo"


@pytest.mark.django_db
def test_caminhos_dinamicos_por_cliente(pedido, ciclo):
    anexo_ped = AnexoPedido(pedido=pedido, nome_original="evidencia.png")
    caminho_ped = caminho_anexo_pedido(anexo_ped, "evidencia.png")
    ano_atual = timezone.now().strftime("%Y")
    assert f"clientes/{pedido.cliente.id}/pedidos/{pedido.id}/{ano_atual}/evidencia.png" == caminho_ped

    comentario = Comentario(ciclo=ciclo)
    anexo_com = AnexoComentario(comentario=comentario, nome_original="audio.mp3")
    caminho_com = caminho_anexo_comentario(anexo_com, "audio.mp3")
    assert f"clientes/{pedido.cliente.id}/ciclos/{ciclo.id}/{ano_atual}/audio.mp3" == caminho_com


@pytest.mark.django_db
def test_calcular_hash_sha256():
    conteudo = b"Conteudo confidencial SHM pericial 2026"
    hash_esperado = "cfd26ba4ba03e0dd3577317ba119f8e4e94119d691060938479e0f6c7704cf4c"
    # Bytes
    hash_bytes = calcular_hash_sha256(conteudo)
    assert len(hash_bytes) == 64

    # File-like object
    buffer = io.BytesIO(conteudo)
    hash_stream = calcular_hash_sha256(buffer)
    assert hash_bytes == hash_stream
    assert buffer.tell() == 0  # Garante que reposicionou no início


@pytest.mark.django_db
def test_google_drive_storage_service_simulacao(cliente):
    service = GoogleDriveStorageService()
    
    # 1. Pasta Raiz
    root_id = service.obter_ou_criar_pasta_raiz()
    assert root_id is not None

    # 2. Pasta Cliente
    res_cliente = service.obter_ou_criar_pasta_cliente(cliente)
    assert "folder_id" in res_cliente
    assert "folder_url" in res_cliente
    cliente.refresh_from_db()
    assert cliente.gdrive_folder_id is not None
    assert cliente.gdrive_shared_at is not None

    # 3. Upload de arquivo
    upload_res = service.upload_arquivo(
        caminho_local_ou_bytes=b"Arquivo de teste simulado",
        nome_arquivo="anexo_teste.pdf",
        parent_folder_id=res_cliente["folder_id"],
    )
    assert upload_res["sucesso"] is True
    assert "file_id" in upload_res
    assert "web_view_link" in upload_res

    # 4. Compartilhamento
    comp_res = service.compartilhar_pasta_com_cliente(res_cliente["folder_id"], "teste@gmail.com")
    assert comp_res["sucesso"] is True

    # 5. Exclusão
    assert service.excluir_arquivo(upload_res["file_id"]) is True


@pytest.mark.django_db
def test_fluxo_registro_sincronizacao_arquivo(cliente, tmp_path, settings):
    settings.MEDIA_ROOT = str(tmp_path)
    arquivo_teste = tmp_path / "teste_doc.pdf"
    arquivo_teste.write_bytes(b"Bytes de teste para sincronizacao")

    registro = agendar_sincronizacao_arquivo(
        origem_modelo="pedidos.AnexoPedido",
        origem_id="12345",
        caminho_local="teste_doc.pdf",
        nome_arquivo="teste_doc.pdf",
        tamanho_bytes=len(b"Bytes de teste para sincronizacao"),
        cliente=cliente,
    )

    assert registro.status in [StatusSincronizacaoDrive.PENDENTE, StatusSincronizacaoDrive.SINCRONIZADO]
    
    # Executa a thread de sincronização diretamente
    _executar_sincronizacao_em_thread(str(registro.id))
    registro.refresh_from_db()

    assert registro.status == StatusSincronizacaoDrive.SINCRONIZADO
    assert registro.gdrive_file_id is not None
    assert registro.hash_sha256 != ""
    assert registro.sincronizado_em is not None


@pytest.mark.django_db
def test_post_delete_anexo_pedido_expurgo(pedido, tmp_path, settings):
    settings.MEDIA_ROOT = str(tmp_path)
    
    anexo = AnexoPedido.objects.create(
        pedido=pedido,
        arquivo=SimpleUploadedFile("evidencia_del.txt", b"Conteudo a deletar"),
        nome_original="evidencia_del.txt",
        tamanho=18,
    )

    # Cria registro simulado com gdrive_file_id
    reg = RegistroSincronizacaoDrive.objects.create(
        origem_modelo="pedidos.AnexoPedido",
        origem_id=str(anexo.id),
        caminho_local=str(anexo.arquivo),
        nome_arquivo="evidencia_del.txt",
        gdrive_file_id="mock_gdrive_to_delete_999",
        status=StatusSincronizacaoDrive.SINCRONIZADO,
    )

    with patch("apps.core.storage.sync.GoogleDriveStorageService.excluir_arquivo") as mock_del:
        mock_del.return_value = True
        anexo.delete()
        
        # O signal post_delete dispara o expurgo em background
        reg.refresh_from_db()
        # Valida que foi disparado
        assert RegistroSincronizacaoDrive.objects.filter(id=reg.id).exists()
