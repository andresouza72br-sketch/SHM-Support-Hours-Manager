# Requisitos do Módulo: Core & Storage Híbrido

> Módulo: `core`  
> Status: 🟢 CONFIRMADO  
> Rastreabilidade: `backend/apps/core/` e `_reversa_forward/011-storage-hibrido-vps-drive/`

---

## 1. Visão Geral
O módulo `core` provê as fundações arquiteturais compartilhadas por toda a aplicação SHM, incluindo o modelo base com carimbos temporais (`TimeStampedModel`), padronização global de erros HTTP RFC 7807, e o novo ecossistema de **Storage Híbrido Local-First** com espelhamento assíncrono para o Google Drive corporativo e gestão de integridade criptográfica SHA-256.

---

## 2. Requisitos Funcionais

### RF-CORE-01: Modelo Base Auditável
- Toda entidade do sistema deve herdar de `TimeStampedModel`, que registra de forma imutável `criado_em` (`auto_now_add=True`) e `atualizado_em` (`auto_now=True`).

### RF-CORE-02: Armazenamento Local-First VPS
- Todos os arquivos enviados via upload no SHM devem ser armazenados fisicamente no disco da VPS com caminhos determinísticos organizados por cliente:
  - Pedidos: `/media/clientes/{cliente_id}/pedidos/{pedido_id}/{ano}/{uuid}_{filename}`
  - Ciclos/Comentários: `/media/clientes/{cliente_id}/ciclos/{ciclo_id}/{ano}/{uuid}_{filename}`
- O download e o streaming de mídia (especialmente mensagens de voz em MP3) devem ser servidos diretamente da VPS com latência zero.

### RF-CORE-03: Cálculo de Hash Criptográfico em Streaming
- No momento do salvamento do arquivo no disco, calcular o hash SHA-256 processando o arquivo em chunks de 64KB sem carregar todo o arquivo na memória RAM.
- Persistir o hash nos modelos de anexo para garantir auditoria e comprovação forense de integridade.

### RF-CORE-04: Espelhamento Assíncrono com Google Drive
- Após o commit da transação (`transaction.on_commit`), despachar thread em background para enviar cópia do arquivo ao Google Drive corporativo utilizando Service Account (`proj.eng.sw@gmail.com`).
- Garantir que falhas momentâneas de rede ou indisponibilidade da API Google Drive operem em modo *fail-open* (o upload na VPS é concluído com sucesso e o registro é marcado como `PENDENTE`).

### RF-CORE-05: Compartilhamento Seguro por Cliente
- O serviço Google Drive deve criar e gerenciar uma pasta raiz para cada cliente (`[SHM] {Nome} (ID: {id})`).
- Conceder permissão de leitura (`role: reader`) para o `email_google_drive` informado no cadastro do cliente, mantendo o acesso restrito e sem gerar links públicos.

### RF-CORE-06: Expurgo Físico em Cascata
- Ao excluir um anexo no sistema, os signals `post_delete` devem remover o arquivo local da VPS e despachar a exclusão da cópia espelhada no Google Drive.

### RF-CORE-07: Comando Administrativo de Contingência
- Disponibilizar comando CLI `python manage.py sincronizar_storage_drive` com opções `--forcar`, `--apenas-erros` e `--cliente-id` para varredura em lote e re-sincronização de contingência.
