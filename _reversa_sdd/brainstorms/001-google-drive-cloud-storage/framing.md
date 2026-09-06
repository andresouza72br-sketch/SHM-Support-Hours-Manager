# Framing, google-drive-cloud-storage

> Selo 🟡 PLANEJADO em todos os itens, sujeito a validação.

## Classificação da entrada
🟡 Solução disfarçada de problema — O usuário refinou a proposta para um modelo arquitetural Híbrido: armazenamento primário de alta performance na VPS organizado por pasta/cliente + espelhamento em nuvem no Google Drive corporativo (`proj.eng.sw@gmail.com`) com compartilhamento de pasta com a conta Google do cliente (que loga no SHM via OAuth Google).

## Problema
🟡 Arquivos de clientes (uploads em chamados, mensagens em ciclos, relatórios e backups) ficavam desorganizados em diretórios genéricos da VPS sem espelhamento externo, expondo a operação a risco de perda de dados e demandando storage caro na VPS, enquanto a empresa possui 5 TB ociosos no Google Drive corporativo e os clientes não possuem acesso direto e centralizado a um backup dos seus próprios arquivos na nuvem.

## Quem sente
🟡 Equipe de infraestrutura/administração do SHM (risco de perda de dados, falta de redundância e custo de disco) e os clientes (ausência de um repositório sincronizado em nuvem onde possam acessar, visualizar e fazer backup dos seus documentos a qualquer momento).

## Quando dói
🟡 No fluxo diário de chamados (uploads de múltiplos anexos até 25 MB, áudios MP3 de comunicação), na necessidade de auditar ou recuperar arquivos e na solicitação de clientes por cópia/backup integral de seus documentos.

## Custo de não fazer
🟡 Risco de perda de arquivos em caso de falha de disco da VPS; atrito com clientes que demandam cópia ou histórico de arquivos; dependência exclusiva de backup manual de servidor e subutilização dos 5 TB do plano corporativo do Google.

## Job to be done
🟡 Quando um cliente ou técnico fizer upload de arquivos ou gerar relatórios no SHM, eu quero que o sistema grave e responda localmente na VPS de forma rápida e organizada por pasta de cliente, e copie de forma espelhada para o Google Drive corporativo do SHM compartilhando a respectiva pasta com a conta Google do cliente, para conseguir alta velocidade de resposta, redundância em nuvem e autonomia de backup para o cliente.

## Fora de escopo declarado
🟡 Obrigar a aplicação a depender exclusivamente de chamadas remotas de API para cada leitura ou streaming de áudio; exigir que o cliente ceda permissões de escrita/OAuth do Drive dele para o SHM gravar diretamente na conta dele (o SHM compartilha a pasta dele no Drive Corporativo, e o cliente copia se quiser).

## Âncoras no legado
🟡 Mapeado no SDD legado:
- **`GAP-01` & `FEAT-ROAD-05`** em `_reversa_sdd/gaps.md`: armazenamento e sincronização de anexos em nuvem.
- **`addenda/004-anexos-pedidos-ciclos-msgs.md`**: modelos `AnexoPedido` e `AnexoComentario`, limite de 25 MB, player MP3 nativo e exclusão física em cascata via `post_delete`.
- **`contratos/requirements.md` e `adrs/004-integridade-criptografica-sha256-em-documentos.md`**: integridade pericial via hash SHA-256 mantida na persistência local.
- **`c4-containers.md`**: conteiner de storage preparado para modelo híbrido (Local Filesystem + Cloud Storage).

---
Gerado por reversa-framer em 2026-09-06T11:39:00-03:00  
Sessão: 001-google-drive-cloud-storage
