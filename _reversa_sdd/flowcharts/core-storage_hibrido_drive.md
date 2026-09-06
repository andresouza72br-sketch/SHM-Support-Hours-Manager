# Fluxograma de Função: Storage Híbrido VPS Local-First com Espelhamento Google Drive

> Módulo: `core` (submódulo `storage`)  
> Nível: `detalhado`  
> Rastreabilidade: `backend/apps/core/storage/` e `_reversa_forward/011-storage-hibrido-vps-drive/`

```mermaid
flowchart TD
    A([Início: Requisição de Upload do Usuário]) --> B[Recebe arquivo multipart no endpoint REST]
    B --> C[Sanitiza nome do arquivo e gera UUID único]
    C --> D[Determina caminho determinístico por cliente: /media/clientes/ID/...]
    D --> E[Grava arquivo fisicamente no disco da VPS]
    E --> F[Calcula hash SHA-256 via streaming em chunks de 64KB]
    F --> G[Persiste Model AnexoPedido / AnexoComentario com hash_sha256]
    G --> H[Cria RegistroSincronizacaoDrive com status PENDENTE]
    H --> I[Commit da transação do banco de dados]
    
    I --> J{transaction.on_commit disparado?}
    J -- Sim --> K[Envia resposta HTTP 201 Created para o cliente VPS rápida]
    J -- Background Thread --> L[Inicia despachador assíncrono sync.py]
    
    L --> M{Verifica se Cliente tem pasta no Drive?}
    M -- Não --> N[GoogleDriveStorageService: Cria pasta do cliente no Google Drive]
    N --> O{email_google_drive informado?}
    O -- Sim --> P[Aplica permissão role: reader no Drive para o cliente]
    O -- Não --> Q[Mantém pasta restrita à conta corporativa]
    P --> R[Grava gdrive_folder_id e url no Cliente]
    Q --> R
    M -- Sim --> R
    
    R --> S[Executa upload multipart do arquivo para a pasta do Drive]
    S --> T{Upload no Drive concluído com sucesso?}
    T -- Sim --> U[Atualiza RegistroSincronizacaoDrive: status=SINCRONIZADO e drive_file_id]
    T -- Falha / Timeout --> V[Registra erro_mensagem e incrementa tentativas no RegistroSincronizacaoDrive]
    V --> W[Permanece PENDENTE para reprocessamento via cron/CLI sincronizar_storage_drive]
    U --> X([Fim: Arquivo disponível na VPS e espelhado com segurança no Drive])
    W --> X
```

---

### Expurgo em Cascata (post_delete)

```mermaid
flowchart TD
    D1([Deleção de Anexo no SHM]) --> D2[Signal post_delete acionado]
    D2 --> D3[Remove arquivo físico do disco local da VPS]
    D2 --> D4[Localiza RegistroSincronizacaoDrive associado]
    D4 --> D5{Possui drive_file_id?}
    D5 -- Sim --> D6[Chama GoogleDriveStorageService.excluir_arquivo]
    D6 --> D7[Arquivo removido do Google Drive corporativo]
    D5 -- Não --> D8[Apenas remove registro de sincronização]
    D7 --> D9[Remove RegistroSincronizacaoDrive do banco]
    D8 --> D9
    D9 --> D10([Fim: Expurgo completo e consistente])
```
