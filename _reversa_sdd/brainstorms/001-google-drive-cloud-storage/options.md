# Options, google-drive-cloud-storage

> Selo 🟡 PLANEJADO em todos os itens. Nenhuma opção foi escolhida ainda.

## Problema de referência
🟡 Quando a camada de storage estiver desacoplada e integrada ao Cloud Storage, eu quero poder usar inicialmente a conta Google corporativa do SHM (5 TB) e futuramente acoplar de forma plugável a conta Google Drive individual de cada cliente (via OAuth), para conseguir segurança, custo distribuído, isolamento de dados e habilitar o SHM a escalar como modelo SaaS.

## Restrições ativas
🟡 Uso prioritário do Google Drive corporativo já contratado (`proj.eng.sw@gmail.com` com 5 TB de capacidade); permissões da aplicação SHM já concedidas na Google Cloud Console; necessidade de segurança e isolamento de permissões; arquitetura acoplável que suporte login OAuth Google existente e viabilize evolução para multi-tenant SaaS; integridade com validação de hash SHA-256 e expurgo de arquivos do sistema.

---

## Opção A, Integrador Direto Google Drive API via Service Account / OAuth Central
- **Em uma frase:** 🟡 Implementar um serviço backend em Django que se comunica diretamente com a Google Drive API usando credenciais corporativas (`proj.eng.sw@gmail.com`), salvando e organizando todos os anexos, backups e relatórios em pastas internas do Drive institucional.
- **Como resolve o problema:** 🟡 Transfere imediatamente todo o armazenamento de mídia e anexos da VPS para os 5 TB do Google Drive corporativo, zerando o custo adicional de disco local do servidor.
- **Esforço:** 🟡 médio , requer implementação de autenticação com Google Drive API v3 (Service Account ou Refresh Token), gerenciamento de pastas por chamado e proxy/stream de download seguro pelo Django.
- **Impacto no legado:** 🟡 Modifica a camada de persistência em `apps.pedidos` (`AnexoPedido`), `apps.comunicacao` (`AnexoComentario`), `apps.contratos` (`DocumentoContrato`) e rotinas de backup, substituindo o manuseio padrão de disco local por chamadas ao serviço Google Drive, preservando o cálculo de SHA-256 e sinais de deleção.
- **Reversibilidade:** 🟡 cara , o código do SHM ficará com dependência direta do SDK/API do Google Drive; migrar para outro storage no futuro exigirá nova refatoração de código.
- **O que precisa ser verdade para funcionar:** 🟡 A API do Google Drive suportar o volume diário de chamadas sem throttling de quota e o backend manter tokens de acesso renovados sem intervenção manual contínua.

## Opção B, Camada de Abstração de Storage Plugável (Driver Pattern) Multi-Tenant
- **Em uma frase:** 🟡 Construir uma interface abstrata de storage (`StorageDriverInterface`) no backend com suporte nativo a múltiplos drivers: Driver 1 (Google Drive Central SHM), Driver 2 (Google Drive OAuth por Tenant/Cliente com isolamento) e Driver 3 (Storage S3-Compatible / Local).
- **Como resolve o problema:** 🟡 Atende à necessidade imediata de desonerar a VPS usando os 5 TB corporativos e implementa a arquitetura desacoplada necessária para o SHM virar SaaS com drives individuais por cliente.
- **Esforço:** 🟡 alto , exige desenhar a interface abstrata de storage, tabela de configuração de storage por tenant/cliente, fluxo OAuth de vinculação de drive por usuário e tratamento de permissões refinadas.
- **Impacto no legado:** 🟡 Criação de um módulo central `apps.core.storage`, refatoração das referências de arquivos em todos os módulos legados (`pedidos`, `ciclos`, `comunicacao`, `contratos`), criação de tabelas de metadados de storage no banco e adaptação da verificação de hash SHA-256.
- **Reversibilidade:** 🟡 fácil , desacopla totalmente a regra de negócio do provedor físico de armazenamento; trocar ou adicionar novos provedores não altera os módulos de chamados e ciclos.
- **O que precisa ser verdade para funcionar:** 🟡 A abstração ser desenhada levando em conta as peculiaridades de APIs de Drive (baseadas em IDs de arquivo e permissões ACL, distintas de storages POSIX baseados em paths).

---

## Opção sempre presente, não construir
- **Em uma frase:** 🟡 Manter o armazenamento na VPS em `MEDIA_ROOT`, mas implantar política rigorosa de expurgo automático de arquivos antigos, compressão obrigatória e limites severos de upload.
- **Como resolve o problema:** 🟡 Mitiga temporariamente o risco de saturação da VPS sem escrever integração com serviços de nuvem ou APIs externas, controlando o volume por ciclo de vida curto.
- **Esforço:** 🟡 baixo , criação de um comando agendado (cron/Celery) para apagar anexos após 30 ou 60 dias e redução do teto de upload em `apps.core.validators.py`.
- **Impacto no legado:** 🟡 Praticamente nenhum nos models; apenas adição de rotina de limpeza temporal e ajuste nas regras de negócio de validação de tamanho de upload.
- **Reversibilidade:** 🟡 fácil , reversível a qualquer momento com a redefinição de prazos de retenção ou desligamento do script de purge.
- **O que precisa ser verdade para funcionar:** 🟡 Os clientes e a operação do SHM aceitarem que arquivos e anexos históricos não fiquem guardados permanentemente, e a empresa aceitar não monetizar nem usufruir dos 5 TB do Google Drive no sistema.

## Opção sempre presente, usar algo pronto
- **Em uma frase:** 🟡 Utilizar montagem de sistema de arquivos no sistema operacional da VPS via `rclone mount` / FUSE espelhando o Google Drive da conta corporativa diretamente na pasta `MEDIA_ROOT` local, ou adotar biblioteca consolidada do ecossistema Django (`django-storages` / `django-google-drive-storage`).
- **Como resolve o problema:** 🟡 Transfere o armazenamento físico para o Google Drive de 5 TB sem exigir que a aplicação Django aprenda a lidar com as complexidades da API do Google Drive em código proprietário.
- **Esforço:** 🟡 baixo a médio , configuração de serviço no Linux (`systemd` com `rclone`) e credencial OAuth corporativa, ou instalação e configuração de pacote Python homologado em `settings.py`.
- **Impacto no legado:** 🟡 Zero alterações nos models e regras de negócio do Django caso utilizado o mount via `rclone` (o Django continua enxergando caminhos de arquivo locais normais); mínima alteração de `DEFAULT_FILE_STORAGE` se usado pacote Python.
- **Reversibilidade:** 🟡 fácil , caso a solução apresente instabilidade, basta apontar a pasta de mídia novamente para o disco local da VPS ou alternar a configuração do storage.
- **O que precisa ser verdade para funcionar:** 🟡 O daemon de sincronização FUSE (`rclone`) ou a biblioteca de terceiros ser tolerante a falhas de conexão de rede transitórias e não causar bloqueios I/O síncronos nos workers do servidor web (Gunicorn/Uvicorn) durante leitura de hash SHA-256 ou streaming de áudio.

---
Gerado por reversa-explorer em 2026-09-06T11:15:00-03:00  
Sessão: 001-google-drive-cloud-storage  
Nenhuma recomendação emitida por design. Convergência é papel de /reversa-arbiter.
