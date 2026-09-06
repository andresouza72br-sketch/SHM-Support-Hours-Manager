# Adendo de Convergência SDD — Feature 011: Storage Híbrido VPS Local-First com Espelhamento Google Drive e Compartilhamento

> **Identificador:** `011-storage-hibrido-vps-drive`  
> **Data:** `2026-09-06`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-06.
Superado pela re-extração de 2026-09-06.

## Resumo da entrega

Implementado o sistema de armazenamento híbrido Local-First para todos os uploads de arquivos, documentos, relatórios e áudios do SHM. Os arquivos são salvos e servidos com latência zero diretamente do disco da VPS em estrutura determinística organizada por cliente (`/media/clientes/{cliente_id}/...`), garantindo alta velocidade de upload, streaming instantâneo de mensagens de voz em MP3 e cálculo de integridade forense SHA-256 via streaming em chunks no momento do salvamento.

Em segundo plano e após o commit da transação do banco (`transaction.on_commit`), um despachador assíncrono espelha os arquivos para o Google Drive corporativo autenticado via Service Account (`proj.eng.sw@gmail.com`) e compartilha automaticamente a pasta raiz do cliente com seu e-mail Google (`role: reader`), permitindo que o cliente localize seus arquivos em "Compartilhados comigo" e faça backup em sua conta pessoal. Em caso de deleção, o expurgo local e em nuvem opera em cascata (`post_delete`). Foi disponibilizado também o comando administrativo de contingência `sincronizar_storage_drive` para varreduras em lote e retentativas automáticas. Na interface web, a tela `DetalhePedidoPage.tsx` foi equipada com botão de acesso direto à pasta no Drive, acionador manual "Sincronizar Nuvem", selos de status de espelhamento por anexo e exibição do hash SHA-256, enquanto o modal `NovoClienteModal.tsx` permite configurar o e-mail Google de compartilhamento.

Total de 12 ações atômicas concluídas com sucesso (T001 a T012), com 6/6 testes passando no `pytest` (`test_storage_hibrido_drive.py`) e compilação de produção no frontend validada com zero erros no `npm run build`.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.core.storage` | `componente-novo` | Submódulo `apps.core.storage` com `paths.py` (resolução determinística e SHA-256), `google_drive_service.py` (Service Account v3 e permissões) e `sync.py` (despachador assíncrono). |
| `_reversa_sdd/architecture.md` | `backend/apps.core.models` | `componente-novo` | Modelo `RegistroSincronizacaoDrive` para rastreamento de auditoria, hashes SHA-256 e status de espelhamento em nuvem. |
| `_reversa_sdd/architecture.md` | `backend/apps.clientes` | `delta-de-dados` | Modelo `Cliente` expandido com `email_google_drive`, `gdrive_folder_id`, `gdrive_folder_url` e `gdrive_shared_at`. |
| `_reversa_sdd/architecture.md` | `backend/apps.pedidos` | `regra-alterada` | `AnexoPedido` agora grava em `/media/clientes/{id}/pedidos/{id}/{ano}/...`, calcula SHA-256 e sincroniza/expurga via signals `post_save`/`post_delete`. |
| `_reversa_sdd/architecture.md` | `backend/apps.comunicacao` | `regra-alterada` | `AnexoComentario` grava em `/media/clientes/{id}/ciclos/{id}/{ano}/...`, calcula SHA-256 e sincroniza/expurga via signals `post_save`/`post_delete`. |
| `_reversa_sdd/architecture.md` | `backend/endpoints` | `delta-de-contrato-externo` | Novos endpoints `@action` `status_storage` e `sincronizar_storage` em `PedidoViewSet`, e `sincronizar_drive` em `ClienteViewSet`. |
| `_reversa_sdd/architecture.md` | `frontend` | `componente-alterado` | `DetalhePedidoPage.tsx` com link para pasta do Drive, botão "Sincronizar Nuvem" e status por arquivo; `NovoClienteModal.tsx` com campo "E-mail Google do Cliente". |
| `_reversa_sdd/domain.md` | `storage-hibrido` | `regra-nova` | **RN-01:** Local-First na VPS como Single Source of Truth para uploads rápidos e streaming de áudio sem latência. |
| `_reversa_sdd/domain.md` | `storage-hibrido` | `regra-nova` | **RN-02:** Espelhamento assíncrono em nuvem desacoplado via `transaction.on_commit` e threading sem travar requisições. |
| `_reversa_sdd/domain.md` | `storage-hibrido` | `regra-nova` | **RN-03:** Compartilhamento estrito por cliente no Google Drive corporativo (`role: reader`) sem links públicos. |
| `_reversa_sdd/domain.md` | `storage-hibrido` | `regra-nova` | **RN-04:** Integridade criptográfica via hash SHA-256 por streaming em chunks para conformidade forense. |
| `_reversa_sdd/domain.md` | `storage-hibrido` | `regra-nova` | **RN-05:** Expurgo em cascata (`post_delete`) mantendo consistência entre VPS e Google Drive. |
| `_reversa_sdd/domain.md` | `storage-hibrido` | `regra-nova` | **RN-06:** Contingência de rede e retentativas automáticas via comando CLI administrativo `sincronizar_storage_drive`. |

## Regras sob vigilância

- `W001`: Fail-open local: falhas transitórias de rede ou cotas da API Google Drive nunca travam o upload local na VPS. Ver `_reversa_forward/011-storage-hibrido-vps-drive/regression-watch.md`.
- `W002`: Expurgo em cascata: exclusão de anexos remove fisicamente o arquivo local e aciona remoção da cópia no Drive. Ver `_reversa_forward/011-storage-hibrido-vps-drive/regression-watch.md`.
- `W003`: Streaming nativo de áudio (MP3/WAV) consumido com zero latência sem intermediação de autorização web do Drive. Ver `_reversa_forward/011-storage-hibrido-vps-drive/regression-watch.md`.
- `W004`: Sanitização estrita de nomes de arquivos e prevenção de directory traversal antes de salvar no disco. Ver `_reversa_forward/011-storage-hibrido-vps-drive/regression-watch.md`.
- `W005`: Integridade forense garantida pela verificação do hash SHA-256 do arquivo gravado. Ver `_reversa_forward/011-storage-hibrido-vps-drive/regression-watch.md`.

## Fontes

- `_reversa_forward/011-storage-hibrido-vps-drive/requirements.md`
- `_reversa_forward/011-storage-hibrido-vps-drive/roadmap.md`
- `_reversa_forward/011-storage-hibrido-vps-drive/legacy-impact.md`
- `_reversa_forward/011-storage-hibrido-vps-drive/regression-watch.md`
- `_reversa_forward/011-storage-hibrido-vps-drive/actions.md`
- `_reversa_forward/011-storage-hibrido-vps-drive/progress.jsonl`
