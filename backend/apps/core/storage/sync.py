import os
import logging
import threading
from typing import Optional
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from apps.core.models import RegistroSincronizacaoDrive, StatusSincronizacaoDrive
from apps.core.storage.google_drive_service import GoogleDriveStorageService
from apps.core.storage.paths import calcular_hash_sha256

logger = logging.getLogger(__name__)

def _executar_sincronizacao_em_thread(registro_id: str):
    """
    Executa o upload do arquivo para o Google Drive corporativo em background thread,
    atualizando o status e retentativas em RegistroSincronizacaoDrive.
    """
    try:
        registro = RegistroSincronizacaoDrive.objects.filter(id=registro_id).first()
        if not registro:
            return

        registro.status = StatusSincronizacaoDrive.SINCRONIZANDO
        registro.tentativas += 1
        registro.save(update_fields=["status", "tentativas", "atualizado_em"])

        # Resolve o caminho absoluto no sistema de arquivos local da VPS
        caminho_completo = os.path.join(settings.MEDIA_ROOT, registro.caminho_local)
        if not os.path.exists(caminho_completo):
            registro.status = StatusSincronizacaoDrive.ERRO
            registro.ultimo_erro = f"Arquivo local não encontrado em: {caminho_completo}"
            registro.save(update_fields=["status", "ultimo_erro", "atualizado_em"])
            return

        # Verifica e recalcula hash SHA-256 se necessário
        if not registro.hash_sha256:
            with open(caminho_completo, "rb") as f:
                registro.hash_sha256 = calcular_hash_sha256(f)

        service = GoogleDriveStorageService()
        pasta_destino_id = None

        if registro.cliente:
            cliente_pasta = service.obter_ou_criar_pasta_cliente(registro.cliente)
            pasta_destino_id = cliente_pasta.get("folder_id")

        # Determina subpasta por módulo (ex.: "pedidos", "ciclos", "contratos")
        modulo_subpasta = "geral"
        if "." in registro.origem_modelo:
            modulo_subpasta = registro.origem_modelo.split(".")[0]
        elif "_" in registro.origem_modelo:
            modulo_subpasta = registro.origem_modelo.split("_")[0]

        if pasta_destino_id and pasta_destino_id != "mock_root_shm_storage_id":
            pasta_destino_id = service.obter_ou_criar_subpasta(pasta_destino_id, modulo_subpasta)

        resultado = service.upload_arquivo(
            caminho_local_ou_bytes=caminho_completo,
            nome_arquivo=registro.nome_arquivo,
            parent_folder_id=pasta_destino_id or service.obter_ou_criar_pasta_raiz(),
        )

        if resultado.get("sucesso"):
            registro.status = StatusSincronizacaoDrive.SINCRONIZADO
            registro.gdrive_file_id = resultado.get("file_id")
            registro.gdrive_web_view_link = resultado.get("web_view_link")
            registro.sincronizado_em = timezone.now()
            registro.ultimo_erro = None
            registro.save(update_fields=[
                "status", "gdrive_file_id", "gdrive_web_view_link",
                "sincronizado_em", "ultimo_erro", "hash_sha256", "atualizado_em"
            ])
            logger.info(f"Arquivo espelhado no Google Drive corporativo: {registro.nome_arquivo} ({registro.gdrive_file_id})")
        else:
            registro.status = StatusSincronizacaoDrive.ERRO
            registro.ultimo_erro = resultado.get("erro", "Erro desconhecido no upload para Google Drive")
            registro.save(update_fields=["status", "ultimo_erro", "atualizado_em"])
            logger.warning(f"Falha ao sincronizar arquivo com Google Drive: {registro.ultimo_erro}")

    except Exception as exc:
        logger.exception(f"Exceção no background worker de sincronização Drive: {exc}")
        try:
            registro = RegistroSincronizacaoDrive.objects.filter(id=registro_id).first()
            if registro:
                registro.status = StatusSincronizacaoDrive.ERRO
                registro.ultimo_erro = str(exc)
                registro.save(update_fields=["status", "ultimo_erro", "atualizado_em"])
        except Exception:
            pass


def agendar_sincronizacao_arquivo(
    origem_modelo: str,
    origem_id: str,
    caminho_local: str,
    nome_arquivo: str,
    tamanho_bytes: int = 0,
    hash_sha256: str = "",
    cliente=None,
) -> RegistroSincronizacaoDrive:
    """
    Cria ou atualiza o registro de sincronização e agenda a transmissão assíncrona
    para o Google Drive corporativo imediatamente após o commit do banco.
    """
    registro, criado = RegistroSincronizacaoDrive.objects.get_or_create(
        origem_modelo=origem_modelo,
        origem_id=str(origem_id),
        defaults={
            "cliente": cliente,
            "caminho_local": caminho_local,
            "nome_arquivo": nome_arquivo,
            "tamanho_bytes": tamanho_bytes,
            "hash_sha256": hash_sha256,
            "status": StatusSincronizacaoDrive.PENDENTE,
        }
    )

    if not criado:
        registro.cliente = cliente or registro.cliente
        registro.caminho_local = caminho_local
        registro.nome_arquivo = nome_arquivo
        registro.tamanho_bytes = tamanho_bytes or registro.tamanho_bytes
        if hash_sha256:
            registro.hash_sha256 = hash_sha256
        registro.status = StatusSincronizacaoDrive.PENDENTE
        registro.save()

    def _disparar():
        t = threading.Thread(target=_executar_sincronizacao_em_thread, args=(str(registro.id),), daemon=True)
        t.start()

    try:
        transaction.on_commit(_disparar)
    except Exception:
        # Se estiver fora de um bloco atômico (ex.: em testes ou script direto), dispara direto
        _disparar()

    return registro


def agendar_expurgo_arquivo_drive(gdrive_file_id: Optional[str]):
    """
    Despacha a exclusão de um arquivo no Google Drive corporativo de forma assíncrona.
    """
    if not gdrive_file_id:
        return

    def _expurgar():
        try:
            service = GoogleDriveStorageService()
            service.excluir_arquivo(gdrive_file_id)
            RegistroSincronizacaoDrive.objects.filter(gdrive_file_id=gdrive_file_id).update(
                status=StatusSincronizacaoDrive.EXCLUIDO,
                atualizado_em=timezone.now(),
            )
            logger.info(f"Arquivo expurgado no Google Drive: {gdrive_file_id}")
        except Exception as exc:
            logger.warning(f"Erro ao expurgar arquivo no Google Drive ({gdrive_file_id}): {exc}")

    t = threading.Thread(target=_expurgar, daemon=True)
    t.start()
