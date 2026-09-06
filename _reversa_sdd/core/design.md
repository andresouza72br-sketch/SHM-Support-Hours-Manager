# Design Técnico do Módulo: Core & Storage Híbrido

> Módulo: `core`  
> Status: 🟢 CONFIRMADO  
> Rastreabilidade: `backend/apps/core/`

---

## 1. Arquitetura de Classes e Componentes

### 1.1. `TimeStampedModel` (`backend/apps/core/models.py`)
- Classe abstrata herdada por todos os modelos que necessitam de rastreabilidade temporal.

### 1.2. `RegistroSincronizacaoDrive` (`backend/apps/core/models.py`)
- Rastreia o ciclo de vida do espelhamento de cada arquivo na nuvem Google Drive.
- Campos principais: `cliente`, `tabela_origem`, `registro_id`, `caminho_vps`, `nome_arquivo`, `tamanho_bytes`, `hash_sha256`, `drive_file_id`, `drive_web_view_link`, `status`, `tentativas`, `erro_mensagem`, `sincronizado_em`.

### 1.3. Submódulo `storage` (`backend/apps/core/storage/`)
- `paths.py`:
  - `caminho_anexo_pedido(instance, filename)`: Formata caminho determinístico por cliente para pedidos.
  - `caminho_anexo_comentario(instance, filename)`: Formata caminho determinístico por cliente para ciclos.
  - `sanitizar_nome_arquivo(filename)`: Normaliza caracteres acentuados, remove perigos de traversal e anexa UUID curto.
  - `calcular_hash_sha256(arquivo_ou_caminho)`: Calcula SHA-256 via streaming em blocos de 64KB.
- `google_drive_service.py`:
  - `GoogleDriveStorageService`: Autenticação via Google Service Account JSON.
  - Métodos: `obter_ou_criar_pasta_raiz()`, `obter_ou_criar_pasta_cliente()`, `compartilhar_pasta_com_email()`, `upload_arquivo()`, `excluir_arquivo()`.
- `sync.py`:
  - `despachar_sincronizacao_anexo_async(anexo, tabela_origem)`: Enfileira a sincronização em thread desacoplada após `transaction.on_commit`.
  - `executar_sincronizacao_registro(registro_id)`: Executa upload, atualiza status e trata retentativas.
  - `despachar_expurgo_drive_async(tabela_origem, registro_id)`: Expurga o arquivo espelhado do Drive no `post_delete`.

---

## 2. Invariantes Técnicas
- **Zero-Blocking:** O envio para o Google Drive jamais ocorre dentro do request/response HTTP. É estritamente assíncrono via thread e disparado apenas após confirmação do commit no banco de dados.
- **Fail-Open:** Se a API Google falhar, a requisição do usuário não é afetada. O arquivo já reside seguro na VPS e o status `PENDENTE` possibilita reprocessamento automático.
