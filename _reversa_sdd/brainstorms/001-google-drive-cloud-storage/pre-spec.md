# Pre-Spec, google-drive-cloud-storage

> Selo 🟡 PLANEJADO. Insumo de entrada para o próximo pipeline, não é uma spec.

## Problema
🟡 Os arquivos de clientes precisam ser servidos com altíssima velocidade no SHM sem dependência síncrona de serviços externos, ao mesmo tempo em que a empresa e os clientes demandam um espelho de backup contínuo, seguro e acessível na nuvem utilizando os 5 TB do Google Drive corporativo (`proj.eng.sw@gmail.com`).

## Caminho escolhido
🟡 Arquitetura Híbrida: O SHM grava e atende arquivos primariamente no disco local da VPS organizado por cliente (`/media/clientes/{cliente_id}/...`), e um serviço de background sincroniza/copia os arquivos para o Google Drive corporativo do SHM (via Service Account JSON), compartilhando a respectiva pasta no Drive com o email Google do cliente (que loga no SHM via Google OAuth).

## Escopo mínimo da primeira entrega
🟡 1. **Padronização Local na VPS:** Reestruturar os caminhos de upload de `apps.pedidos` (`AnexoPedido`), `apps.comunicacao` (`AnexoComentario`) e `apps.contratos` para `/media/clientes/{cliente_id}/{modulo}/{ano}/{arquivo}`, mantendo cálculo local imediato de SHA-256 e entrega de streaming rápido (especialmente para áudios MP3).  
🟡 2. **Sincronizador Google Drive Corporativo:** Criar serviço em background (rotina assíncrona/signal/task) que envia cópias dos arquivos locais para a pasta `/SHM-Storage/Clientes/{cliente_id}/...` no Google Drive corporativo usando a Service Account JSON já ativa.  
🟡 3. **Compartilhamento de Pasta:** Conceder permissão de leitura (`role: reader`) na pasta do cliente no Drive corporativo para o email Google associado ao cadastro do cliente no SHM.

## Não-objetivos
🟡 Gravação síncrona direta no Google Drive como storage primário (evitando travar workers web); conexão OAuth de escrita no Drive particular do cliente (o cliente tem acesso compartilhado de leitura na pasta dele no Drive corporativo do SHM e pode copiar se desejar); provedores externos de terceiros (S3/MinIO).

## Restrições ativas
🟡 Autenticação máquina-a-máquina corporativa via Service Account Google (chave JSON já presente no SHM com APIs ativadas: Drive, Calendar e Gmail); login de usuários no SHM via OAuth Google; teto de 25 MB por anexo (`apps.core.validators.py`); conferência pericial de integridade via SHA-256 (`contratos/requirements.md` RF-CON-05).

## Critério de pronto
🟡 1. Uploads em chamados ou mensagens salvam imediatamente no disco da VPS na pasta organizada do cliente e respondem sem atraso perceptível na interface.  
🟡 2. Em background, o arquivo é copiado para o Google Drive corporativo dentro da pasta correspondente do cliente.  
🟡 3. A pasta do cliente no Google Drive corporativo é compartilhada com o email Google do cliente, ficando visível em "Compartilhados comigo" no Google Drive dele.  
🟡 4. Exclusão física no SHM expurga o arquivo na VPS e aciona exclusão da cópia espelho no Google Drive corporativo.

## Premissa a validar primeiro
🟡 A Service Account corporativa conseguir criar uma pasta no Google Drive corporativo e aplicar a chamada de permissão (`permissions().create`) compartilhando essa pasta com um email de teste de cliente.

## Riscos herdados
🟡 Garantir que a rotina assíncrona de sincronização lide com re-tentativas caso a conexão com a Google oscile, sem deixar arquivos locais pendentes de sincronismo; garantir que a deleção de arquivos no SHM sincronize a exclusão no Google Drive para manter espelhos idênticos.

## Âncoras no legado
🟡 `_reversa_sdd/gaps.md` (GAP-01 e FEAT-ROAD-05: abstração e persistência em nuvem);  
🟡 `_reversa_sdd/addenda/004-anexos-pedidos-ciclos-msgs.md` (validações, player MP3 e signal `post_delete`);  
🟡 `_reversa_sdd/adrs/004-integridade-criptografica-sha256-em-documentos.md` e `contratos/requirements.md` (conferência SHA-256);  
🟡 Módulo de autenticação/OAuth existente no SHM (`apps.accounts`).

## Dúvidas abertas
- [DÚVIDA] 🟡 O gatilho de sincronização para o Google Drive corporativo deve rodar imediatamente após a transação de banco de dados do upload (`transaction.on_commit`) ou por meio de um comando/worker agendado periódico (ex.: a cada X minutos)?
- [DÚVIDA] 🟡 Caso o email cadastrado do cliente no SHM não seja uma conta Google (ex.: email corporativo sob outro domínio), como o SHM deve solicitar o email Google alternativo para conceder o compartilhamento da pasta no Drive?
- [DÚVIDA] 🟡 Deve haver uma ação manual na interface ("Re-sincronizar pasta no Drive") para o administrador ou técnico forçar o espelhamento caso um arquivo falhe?

---
Gerado por reversa-pre-spec em 2026-09-06T11:41:00-03:00  
Sessão: 001-google-drive-cloud-storage  
Destino sugerido: /reversa-requirements
