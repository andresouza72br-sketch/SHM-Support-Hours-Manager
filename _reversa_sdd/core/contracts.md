# Contratos e Interfaces do Módulo: Core & Storage Híbrido

> Módulo: `core`  
> Status: 🟢 CONFIRMADO  
> Rastreabilidade: `backend/apps/core/`

---

## 1. Contratos CLI (Management Commands)

### `python manage.py sincronizar_storage_drive`
- **Finalidade:** Varredura em lote e retentativa de contingência para espelhamento com Google Drive.
- **Argumentos:**
  - `--forcar`: Re-sincroniza mesmo arquivos que já constem como `SINCRONIZADO`.
  - `--apenas-erros`: Filtra apenas registros que falharam anteriormente (`status='ERRO'`).
  - `--cliente-id <ID>`: Restringe a varredura aos anexos de um cliente específico.

---

## 2. Contratos Internos (Python API)

### `GoogleDriveStorageService`
```python
class GoogleDriveStorageService:
    def obter_ou_criar_pasta_raiz(self) -> str: ...
    def obter_ou_criar_pasta_cliente(self, cliente) -> Tuple[str, str]: ...
    def compartilhar_pasta_com_email(self, folder_id: str, email: str, role: str = 'reader') -> bool: ...
    def upload_arquivo(self, caminho_local: str, nome_arquivo: str, pasta_destino_id: str, mime_type: str = None) -> Dict[str, Any]: ...
    def excluir_arquivo(self, drive_file_id: str) -> bool: ...
```

### `RegistroSincronizacaoDrive`
- **Enum `StatusSincronizacaoDrive`:** `PENDENTE`, `SINCRONIZADO`, `ERRO`, `IGNORADO`.
