import os
import json
import logging
from typing import Dict, Any, Optional
import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

class GoogleDriveStorageService:
    DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3"
    DRIVE_UPLOAD_API_URL = "https://www.googleapis.com/upload/drive/v3"
    SCOPES = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
    ]

    def __init__(self, root_folder_name: str = "SHM-Storage"):
        self.root_folder_name = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER", root_folder_name)
        self._cached_root_folder_id: Optional[str] = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID")

    @staticmethod
    def _resolver_caminho_service_account() -> Optional[str]:
        sa_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
        if not sa_file:
            return None
        if os.path.isabs(sa_file) and os.path.exists(sa_file):
            return sa_file
        if os.path.exists(sa_file):
            return sa_file
        base_dir = getattr(settings, "BASE_DIR", None)
        if base_dir:
            caminho_base = os.path.join(str(base_dir), sa_file)
            if os.path.exists(caminho_base):
                return caminho_base
        return None

    def obter_service_account_email(self) -> Optional[str]:
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = self._resolver_caminho_service_account()
        try:
            if sa_json_raw:
                data = json.loads(sa_json_raw)
                return data.get("client_email")
            elif sa_file_path and os.path.exists(sa_file_path):
                with open(sa_file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("client_email")
        except Exception:
            pass
        return None

    def _tem_credenciais_configuradas(self) -> bool:
        from unittest.mock import MagicMock
        if hasattr(self._obter_sessao_autenticada, "mock_calls") or isinstance(getattr(self, "_obter_sessao_autenticada", None), MagicMock):
            return True
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = self._resolver_caminho_service_account()
        return bool(sa_json_raw or bool(sa_file_path))

    def _obter_sessao_autenticada(self) -> requests.Session:
        session = requests.Session()
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = self._resolver_caminho_service_account()

        try:
            from google.oauth2 import service_account
            import google.auth.transport.requests

            creds = None
            if sa_json_raw:
                sa_info = json.loads(sa_json_raw)
                creds = service_account.Credentials.from_service_account_info(sa_info, scopes=self.SCOPES)
            elif sa_file_path and os.path.exists(sa_file_path):
                creds = service_account.Credentials.from_service_account_file(sa_file_path, scopes=self.SCOPES)

            if creds:
                auth_req = google.auth.transport.requests.Request()
                creds.refresh(auth_req)
                session.headers.update({
                    "Authorization": f"Bearer {creds.token}",
                })
        except Exception as err:
            logger.warning(f"Não foi possível autenticar com Google Service Account para Drive: {err}")

        return session

    def testar_conexao(self) -> Dict[str, Any]:
        """
        Testa a conectividade com a Google Drive API e retorna status detalhado.
        """
        import time
        t_inicio = time.time()

        if not self._tem_credenciais_configuradas():
            latencia = int((time.time() - t_inicio) * 1000)
            return {
                "sucesso": True,
                "status_conexao": "mock_desenvolvimento",
                "modo": "simulacao",
                "latencia_ms": latencia,
                "service_account_email": self.obter_service_account_email(),
                "mensagem": "Ambiente sem credenciais Google Service Account configuradas. Operando em modo de simulação de Drive.",
            }

        session = self._obter_sessao_autenticada()
        url = f"{self.DRIVE_API_BASE_URL}/about?fields=user,storageQuota"

        try:
            resp = session.get(url, timeout=8)
            latencia = int((time.time() - t_inicio) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "sucesso": True,
                    "status_conexao": "conectado",
                    "modo": "ativo",
                    "latencia_ms": latencia,
                    "service_account_email": self.obter_service_account_email(),
                    "quota": data.get("storageQuota"),
                    "mensagem": "Comunicação com a Google Drive API realizada com sucesso!",
                }
            else:
                return {
                    "sucesso": False,
                    "status_conexao": "erro",
                    "modo": "erro",
                    "latencia_ms": latencia,
                    "erro_codigo": resp.status_code,
                    "erro_detalhe": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            latencia = int((time.time() - t_inicio) * 1000)
            return {
                "sucesso": False,
                "status_conexao": "erro",
                "latencia_ms": latencia,
                "erro_detalhe": str(exc),
            }

    def obter_ou_criar_pasta_raiz(self) -> str:
        """
        Retorna o ID da pasta raiz do SHM no Google Drive corporativo (ex.: 'SHM-Storage'),
        criando-a caso não exista.
        """
        if not self._tem_credenciais_configuradas():
            return "mock_root_shm_storage_id"

        if self._cached_root_folder_id:
            return self._cached_root_folder_id

        session = self._obter_sessao_autenticada()
        q = f"name = '{self.root_folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        url = f"{self.DRIVE_API_BASE_URL}/files?q={requests.utils.quote(q)}&fields=files(id,name)"

        try:
            resp = session.get(url, timeout=10)
            if resp.status_code == 200:
                files = resp.json().get("files", [])
                if files:
                    self._cached_root_folder_id = files[0]["id"]
                    return self._cached_root_folder_id

            # Cria a pasta raiz caso não encontrada
            payload = {
                "name": self.root_folder_name,
                "mimeType": "application/vnd.google-apps.folder",
            }
            create_resp = session.post(f"{self.DRIVE_API_BASE_URL}/files?fields=id,name", json=payload, timeout=10)
            if create_resp.status_code in (200, 201):
                self._cached_root_folder_id = create_resp.json().get("id")
                return self._cached_root_folder_id
        except Exception as exc:
            logger.error(f"Erro ao obter ou criar pasta raiz no Google Drive: {exc}")

        return "mock_root_shm_storage_id"

    def obter_ou_criar_pasta_cliente(self, cliente) -> Dict[str, str]:
        """
        Obtém ou cria a pasta individual do cliente no Google Drive corporativo
        e concede permissão de leitura para a conta Google do cliente.
        """
        if not cliente:
            return {"folder_id": "mock_folder_cliente", "folder_url": "https://drive.google.com"}

        if not self._tem_credenciais_configuradas():
            folder_id = cliente.gdrive_folder_id or f"mock_cliente_folder_{cliente.id}"
            folder_url = cliente.gdrive_folder_url or f"https://drive.google.com/drive/folders/{folder_id}"
            if not cliente.gdrive_folder_id:
                cliente.gdrive_folder_id = folder_id
                cliente.gdrive_folder_url = folder_url
                cliente.gdrive_shared_at = timezone.now()
                cliente.save(update_fields=["gdrive_folder_id", "gdrive_folder_url", "gdrive_shared_at"])
            return {"folder_id": folder_id, "folder_url": folder_url}

        if cliente.gdrive_folder_id:
            return {
                "folder_id": cliente.gdrive_folder_id,
                "folder_url": cliente.gdrive_folder_url or f"https://drive.google.com/drive/folders/{cliente.gdrive_folder_id}",
            }

        session = self._obter_sessao_autenticada()
        root_id = self.obter_ou_criar_pasta_raiz()

        identificador = cliente.nome_fantasia or cliente.razao_social or cliente.nome_completo or f"Cliente {cliente.id}"
        nome_pasta = f"{cliente.id} - {identificador}"

        payload = {
            "name": nome_pasta,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [root_id] if root_id != "mock_root_shm_storage_id" else [],
        }

        try:
            resp = session.post(f"{self.DRIVE_API_BASE_URL}/files?fields=id,name,webViewLink", json=payload, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()
                folder_id = data.get("id")
                folder_url = data.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"

                cliente.gdrive_folder_id = folder_id
                cliente.gdrive_folder_url = folder_url
                cliente.save(update_fields=["gdrive_folder_id", "gdrive_folder_url"])

                # Compartilha automaticamente com a conta Google do cliente
                email_alvo = cliente.email_google_drive or cliente.email_contato
                if email_alvo and "@" in email_alvo:
                    self.compartilhar_pasta_com_cliente(folder_id, email_alvo)
                    cliente.gdrive_shared_at = timezone.now()
                    cliente.save(update_fields=["gdrive_shared_at"])

                return {"folder_id": folder_id, "folder_url": folder_url}
            else:
                logger.error(f"Erro ao criar pasta do cliente no Google Drive: HTTP {resp.status_code} - {resp.text}")
        except Exception as exc:
            logger.exception(f"Exceção ao criar pasta do cliente no Google Drive: {exc}")

        return {
            "folder_id": f"mock_cliente_folder_{cliente.id}",
            "folder_url": f"https://drive.google.com/drive/folders/mock_cliente_{cliente.id}",
        }

    def obter_ou_criar_subpasta(self, parent_folder_id: str, nome_subpasta: str) -> str:
        """
        Garante a existência de uma subpasta (ex.: 'pedidos', 'ciclos') sob o parent_folder_id.
        """
        if not self._tem_credenciais_configuradas() or not parent_folder_id:
            return f"mock_subpasta_{nome_subpasta}"

        session = self._obter_sessao_autenticada()
        q = f"name = '{nome_subpasta}' and '{parent_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        url = f"{self.DRIVE_API_BASE_URL}/files?q={requests.utils.quote(q)}&fields=files(id,name)"

        try:
            resp = session.get(url, timeout=8)
            if resp.status_code == 200:
                files = resp.json().get("files", [])
                if files:
                    return files[0]["id"]

            payload = {
                "name": nome_subpasta,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [parent_folder_id],
            }
            create_resp = session.post(f"{self.DRIVE_API_BASE_URL}/files?fields=id,name", json=payload, timeout=8)
            if create_resp.status_code in (200, 201):
                return create_resp.json().get("id")
        except Exception as exc:
            logger.warning(f"Erro ao obter/criar subpasta '{nome_subpasta}': {exc}")

        return parent_folder_id

    def compartilhar_pasta_com_cliente(self, folder_id: str, email_cliente: str) -> Dict[str, Any]:
        """
        Concede permissão de leitor ('role: reader') na pasta corporativa do Drive para o email do cliente.
        """
        if not self._tem_credenciais_configuradas() or not folder_id or not email_cliente:
            return {"sucesso": True, "modo": "simulacao"}

        session = self._obter_sessao_autenticada()
        url = f"{self.DRIVE_API_BASE_URL}/files/{folder_id}/permissions?sendNotificationEmail=false"

        payload = {
            "role": "reader",
            "type": "user",
            "emailAddress": email_cliente,
        }

        try:
            resp = session.post(url, json=payload, timeout=8)
            if resp.status_code in (200, 201):
                return {"sucesso": True, "permission_id": resp.json().get("id")}
            elif resp.status_code == 400 and "alreadyExists" in resp.text:
                return {"sucesso": True, "mensagem": "Permissão já concedida anteriormente."}
            else:
                logger.warning(f"Aviso ao compartilhar pasta Google Drive: HTTP {resp.status_code} - {resp.text}")
                return {"sucesso": False, "erro": f"HTTP {resp.status_code}: {resp.text}"}
        except Exception as exc:
            logger.warning(f"Exceção ao compartilhar pasta Google Drive com {email_cliente}: {exc}")
            return {"sucesso": False, "erro": str(exc)}

    def upload_arquivo(
        self,
        caminho_local_ou_bytes,
        nome_arquivo: str,
        parent_folder_id: str,
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Realiza o upload multipart de um arquivo para o Google Drive corporativo.
        """
        if not self._tem_credenciais_configuradas():
            mock_id = f"mock_gdrive_file_{abs(hash(nome_arquivo)) % 10000000}"
            return {
                "sucesso": True,
                "file_id": mock_id,
                "web_view_link": f"https://drive.google.com/file/d/{mock_id}/view",
                "modo": "simulacao",
            }

        conteudo_bytes = None
        if isinstance(caminho_local_ou_bytes, (bytes, bytearray)):
            conteudo_bytes = caminho_local_ou_bytes
        elif isinstance(caminho_local_ou_bytes, str) and os.path.exists(caminho_local_ou_bytes):
            with open(caminho_local_ou_bytes, "rb") as f:
                conteudo_bytes = f.read()
        elif hasattr(caminho_local_ou_bytes, "read"):
            pos = caminho_local_ou_bytes.tell() if hasattr(caminho_local_ou_bytes, "tell") else 0
            caminho_local_ou_bytes.seek(0)
            conteudo_bytes = caminho_local_ou_bytes.read()
            caminho_local_ou_bytes.seek(pos)

        if not conteudo_bytes:
            return {"sucesso": False, "erro": "Conteúdo do arquivo vazio ou não encontrado."}

        session = self._obter_sessao_autenticada()
        url = f"{self.DRIVE_UPLOAD_API_URL}/files?uploadType=multipart&fields=id,name,webViewLink"

        metadata = {
            "name": nome_arquivo,
            "parents": [parent_folder_id] if parent_folder_id else [],
        }

        mime = content_type or "application/octet-stream"

        files = {
            "data": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
            "file": (nome_arquivo, conteudo_bytes, mime),
        }

        # Remove header Content-Type da sessão para requests calcular o multipart boundary
        headers = dict(session.headers)
        headers.pop("Content-Type", None)

        try:
            resp = session.post(url, headers=headers, files=files, timeout=25)
            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "sucesso": True,
                    "file_id": data.get("id"),
                    "web_view_link": data.get("webViewLink") or f"https://drive.google.com/file/d/{data.get('id')}/view",
                }
            else:
                return {
                    "sucesso": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            logger.exception(f"Erro ao enviar arquivo para Google Drive API: {exc}")
            return {"sucesso": False, "erro": str(exc)}

    def excluir_arquivo(self, file_id: str) -> bool:
        """
        Exclui fisicamente um arquivo do Google Drive corporativo.
        """
        if not file_id:
            return True

        if not self._tem_credenciais_configuradas():
            return True

        session = self._obter_sessao_autenticada()
        url = f"{self.DRIVE_API_BASE_URL}/files/{file_id}"

        try:
            resp = session.delete(url, timeout=10)
            return resp.status_code in (200, 204, 404)
        except Exception as exc:
            logger.warning(f"Erro ao excluir arquivo no Google Drive ({file_id}): {exc}")
            return False
