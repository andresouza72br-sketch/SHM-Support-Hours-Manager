# ADR 014: Armazenamento Híbrido Local-First na VPS com Espelhamento Contínuo no Google Drive e Compartilhamento de Pastas

## Status
Aceito e Implementado (Feature 011 - Storage Híbrido VPS Drive) 🟢

## Contexto
O SHM lida com volumes crescentes de arquivos de anexos em chamados (pedidos de suporte), ciclos de atendimento, threads de mensagens de voz em MP3 e documentos contratuais. O armazenamento puramente em nuvem síncrona (como Google Drive puro ou S3 direto no upload) gerava riscos de latência percebida pelo usuário no upload de arquivos pesados, bufferização lenta no streaming de áudios nativos e falha crítica em requisições de usuário caso a API externa sofresse oscilações de conectividade ou esgotamento de cotas de requisição.

Ao mesmo tempo, armazenar arquivos unicamente no disco local da VPS privaria a empresa e os clientes de redundância segura em nuvem, facilidade de auditoria externa e backups corporativos gerenciados.

## Decisão
1. **Arquitetura Híbrida Local-First:** O disco da VPS atua como Single Source of Truth para resposta síncrona imediata com latência zero nos endpoints de upload e download. Os arquivos são organizados deterministicamente por cliente (`/media/clientes/{cliente_id}/pedidos/...` e `/media/clientes/{cliente_id}/ciclos/...`).
2. **Cálculo de Integridade Forense (SHA-256):** No exato momento do upload na VPS, o hash criptográfico SHA-256 é calculado via streaming em chunks de 64KB e gravado de forma imutável nos modelos de banco de dados (`AnexoPedido`, `AnexoComentario`, `RegistroSincronizacaoDrive`).
3. **Espelhamento Assíncrono Desacoplado:** Após o commit da transação do banco (`transaction.on_commit`), um despachador em background (`sync.py`) espelha os arquivos para o Google Drive corporativo autenticado via Google Service Account existente (`proj.eng.sw@gmail.com`).
4. **Isolamento de Pastas e Compartilhamento Restrito:** O GoogleDriveStorageService cria e mantém a pasta raiz do cliente no Google Drive (`[SHM] {Nome} (ID: {id})`), concedendo acesso exclusivo de leitura (`role: reader`) para a conta Google do cliente (`email_google_drive`), garantindo privacidade estrita e impedindo links públicos.
5. **Expurgo em Cascata:** Signals `post_delete` em `AnexoPedido` e `AnexoComentario` garantem que a remoção do anexo na VPS acione imediatamente o expurgo do arquivo físico correspondente no Google Drive.
6. **Comando de Contingência e Backfill:** Criação do comando `python manage.py sincronizar_storage_drive` para varredura em lote, contingência de falhas temporárias e retentativas automáticas com status `PENDENTE`.

## Alternativas Consideradas
- **Armazenamento 100% Google Drive síncrono no request:** Descartado devido ao acoplamento excessivo, latência de rede no upload e impossibilidade de streaming rápido de áudio MP3 no browser.
- **Armazenamento 100% Local na VPS sem Nuvem:** Descartado por ausência de backup externo corporativo e impossibilidade de o cliente visualizar suas pastas na sua própria conta Google Drive.

## Consequências
- **Positivas:** Uploads instantâneos com fail-open para a VPS; áudio MP3 reproduz sem engasgos; clientes acessam seus documentos organizados na sua pasta "Compartilhados comigo"; integridade forense criptografada comprovada por hash; tolerância total a indisponibilidade transitória da internet.
- **Trade-offs:** Requer espaço em disco na VPS proporcional ao volume ativo de anexos; sincronização com a nuvem é assíncrona (eventual consistency de segundos).
