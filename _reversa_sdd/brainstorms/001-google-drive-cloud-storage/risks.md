# Risks, google-drive-cloud-storage

> Selo 🟡 PLANEJADO em todos os itens. Documento adversarial por design.

## Premortem
🟡 **Manchete 1 (Vazamento de Documentos e Quebra de Privacidade):** *"Falha crítica de isolamento de pastas no Google Drive corporativo expõe arquivos, relatórios periciais e contratos confidenciais de clientes para terceiros via links públicos ou permissões ACL indevidas."*  
🟡 **Manchete 2 (Bloqueio em Massa por Quotas e Revogação OAuth):** *"App do SHM atinge limites de requisições por segundo da Google Drive API v3 ou tem credenciais desautorizadas, paralisando aberturas de chamados, envio de áudios em ciclos e uploads em produção."*  
🟡 **Manchete 3 (Paralisia por Over-engineering e Complexidade Multi-Tenant):** *"Abstração prematura de múltiplos drivers de storage atrasa a entrega em meses, quebra a verificação pericial de integridade SHA-256 e gera inconsistência entre banco relacional e nuvem."*  

**Manchete que mais assusta o usuário:** 🟡 Todas — com gravidade máxima atribuída ao isolamento de dados entre clientes e à necessidade de evitar vazamento entre pastas compartilhadas no Google Drive corporativo.

---

## Opção A, Integrador Direto Google Drive API via Service Account / OAuth Central
- **Premissa que mata:** 🟡 A API do Google Drive v3 comportar uploads síncronos de arquivos de até 25 MB (`backend/apps/core/validators.py`) sem estourar o tempo limite de requisição HTTP (timeout do Gunicorn/Nginx) e sem esgotar as quotas de requisições por usuário.
- **Teste barato da premissa:** 🟡 Script standalone em Python com `google-api-python-client` realizando upload de 10 arquivos simultâneos de 25 MB e medindo tempo, consumo de memória e latência de retorno do `file_id`.
- **Custo escondido:** 🟡 Implementação manual de renovação de tokens, tratamento de re-tentativas com backoff exponencial para erros 429/503 da Google e gerenciamento de permissões granulares por pasta/arquivo.
- **Ponto sem volta:** 🟡 Acoplamento dos models `AnexoPedido`, `AnexoComentario` e `DocumentoContrato` com IDs específicos do Google Drive em vez de abstrações de caminho ou URI de storage.

## Opção B, Camada de Abstração de Storage Plugável (Driver Pattern) Multi-Tenant
- **Premissa que mata:** 🟡 Ser viável modelar uma interface unificada que atenda simultaneamente a sistemas de arquivos baseados em hierarquia de caminhos/paths (S3, MinIO, Local) e ao modelo relacional de IDs/ACLs do Google Drive, sem introduzir complexidade desproporcional para o estágio atual do SHM.
- **Teste barato da premissa:** 🟡 Desenhar a assinatura da classe base `BaseStorageDriver` (`save`, `get_stream_or_url`, `delete`, `calculate_hash`) e simular a implementação de 2 métodos no Google Drive e no Local Storage em teste unitário mockado.
- **Custo escondido:** 🟡 Citado em `_reversa_sdd/adrs/004-integridade-criptografica-sha256-em-documentos.md` e `contratos/requirements.md`: o endpoint de verificação pericial `/verificar_integridade/` exige ler os bytes do arquivo para recalcular o SHA-256; se o arquivo estiver na nuvem e o driver não mantiver o hash na nuvem ou em cache, cada conferência pericial exigirá download completo do arquivo de 25 MB do Google Drive para a VPS.
- **Ponto sem volta:** 🟡 Refatoração profunda de todos os módulos existentes (`pedidos`, `ciclos`, `comunicacao`, `contratos`) para usar a nova camada de injeção de dependência de drivers.

---

## Opção sempre presente, não construir
- **Premissa que mata:** 🟡 Os clientes aceitarem perder histórico e comprovações de chamados passados após período curto de expurgo (ex.: 30 dias), sem gerar atritos jurídicos contratuais de prestação de serviços de suporte.
- **Teste barato da premissa:** 🟡 Avaliar os contratos de suporte e SLAs vigentes quanto à obrigatoriedade legal de guarda probatória de arquivos anexados nos chamados e contratos.
- **Custo escondido:** 🟡 Custo invisível de suporte ao cliente insatisfeito ao tentar baixar comprovante ou arquivo antigo de um ciclo já encerrado e encontrá-lo deletado; custo de expansão de disco VPS a cada ciclo de crescimento.
- **Ponto sem volta:** 🟡 A perda definitiva e irreversível de arquivos deletados pelo script de expurgo automatizado.

## Opção sempre presente, usar algo pronto
- **Premissa que mata:** 🟡 Um mount FUSE (`rclone mount`) ou biblioteca pronta conseguir manter estabilidade 24/7 na VPS Linux sem travar processos do Django quando ocorrerem oscilações de rede com a Google.
- **Teste barato da premissa:** 🟡 Montar o Google Drive via `rclone` em ambiente de staging e executar bateria de testes automatizados (`pytest`) gerando concorrência de leitura e escrita simultânea.
- **Custo escondido:** 🟡 Travamento de I/O em disco virtual FUSE; se a conexão com a Google falhar no meio de uma requisição, o worker do Django pode congelar esperando a resposta do sistema de arquivos montado, derrubando a API do SHM inteira.
- **Ponto sem volta:** 🟡 Dependência de configuração sensível de sistema operacional e daemons externos na VPS, dificultando deploys automatizados e escalabilidade horizontal em contêineres Docker.

---

## Riscos transversais
🟡 **Dados sensíveis e Privacidade (LGPD):** Anexos de chamados, contratos e mensagens contêm dados empresariais confidenciais. Pastas compartilhadas no Google Drive corporativo não podem, sob hipótese alguma, usar compartilhamento "qualquer pessoa com o link", devendo restringir permissões estritamente à conta Google cadastrada do respectivo cliente ou trafegar via proxy autenticado do SHM.  
🟡 **Integridade e Auditoria Forense (`contratos`, `pedidos`):** O SHM implementa rastreabilidade e integridade criptográfica com SHA-256 (conforme `_reversa_sdd/adrs/004-integridade-criptografica-sha256-em-documentos.md`). Mover arquivos para nuvem de terceiros exige garantir que o cálculo do hash seja gerado no ato do upload no backend antes do envio ao Google Drive e registrado no banco de dados imutável.  
🟡 **Ciclo de Vida e Limpeza (`comunicacao`):** O signal `post_delete` documentado em `_reversa_sdd/addenda/004-anexos-pedidos-ciclos-msgs.md` remove anexos físicos do disco ao apagar mensagens; na nuvem, a exclusão precisa chamar explicitamente a Google Drive API para evitar acúmulo de arquivos lixo e custos de quota.  
🟡 **Dependência de Terceiro (Google Cloud Console / API):** Políticas de consentimento de OAuth do Google, limites de projeto não verificado (telas de aviso de app não verificado) e eventuais mudanças de termos da API da Google.

---

## O que precisa ser respondido antes de decidir
1. 🟡 **Método de Autenticação Corporativa:** O SHM usará uma **Service Account Google** (autenticação máquina-para-máquina sem expiração de sessão humana) ou um fluxo OAuth de usuário com Refresh Token da conta `proj.eng.sw@gmail.com`?
2. 🟡 **Padrão de Entrega (Proxy Backend vs. Google Direct Link):** Quando o cliente clica para baixar um anexo ou ouvir um áudio MP3, o Django baixa os bytes da Google e envia para o usuário (Stream Proxy seguro), ou o SHM gera uma URL temporária/compartilhada com a conta do Google do cliente?
3. 🟡 **Estratégia de Pastas e Isolamento:** Como estruturar a árvore no Google Drive (`/SHM-Storage/Clientes/{cliente_id}/Pedidos/{pedido_id}/...`) para garantir que o cliente X nunca enxergue nem liste pastas do cliente Y?
4. 🟡 **Faseamento da Abstração SaaS:** É preferível desenhar a interface desacoplada (`StorageDriver`) implementando hoje apenas o driver Google Drive corporativo e deixando a conexão direta ao drive de cada cliente para uma Fase 2?
5. 🟡 **Fallback de Falhas:** Se a API do Google Drive retornar indisponível (HTTP 503) no momento de um upload de chamado, o sistema rejeita o pedido ou armazena temporariamente em fila/disco local para envio em background?

---
Gerado por reversa-challenger em 2026-09-06T11:25:00-03:00  
Sessão: 001-google-drive-cloud-storage
