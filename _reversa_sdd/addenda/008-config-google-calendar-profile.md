# Adendo de Convergência SDD — Feature 008: Configurações de Perfil de Usuário, Painel do Sistema Google Calendar e Atualização de Menus

> **Identificador:** `008-config-google-calendar-profile`  
> **Data:** `2026-09-05`  
> **Cenário:** `legado`  

---

## Vigência

Vigente desde 2026-09-05.

---

## Resumo da entrega

Implementada a camada de autosserviço, governança e diagnóstico sobre o módulo de agendamento e sincronização corporativa com o Google Calendar / Meet. No backend (`apps.schedule`), criou-se a entidade singleton `ConfiguracaoSchedule` para persistência dinâmica do ID da agenda corporativa no banco de dados (com fallback para `GOOGLE_CALENDAR_ID`), além de endpoints REST de diagnóstico e teste de conexão ativo (`GoogleCalendarService.testar_conexao()`) com timeout de 8 segundos e isolamento de permissões RBAC (`IsEmpresaAdmin`). No frontend, disponibilizou-se a página de Perfil do Usuário (`/perfil`) em modo estritamente somente-leitura com dados sincronizados do Google SSO e botão de 1-clique para adicionar a agenda ao Google Calendar (`calendar.google.com/calendar/render?cid=...`), a página de Configurações do Sistema (`/admin/configuracoes/sistema`) para o Administrador da Empresa auditar e parametrizar a Service Account e o Calendar ID, e a atualização do menu suspenso do cabeçalho (`Header.tsx`) integrando os novos atalhos com controle de acesso por papel.

Total de 16 ações atômicas concluídas com sucesso (T001 a T016), com 174/174 testes passando no `pytest` (zero regressões nas regras legadas) e compilação do frontend TypeScript validada com zero erros no `npm run build`.

---

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.schedule` | `componente-novo` | Nova entidade singleton `ConfiguracaoSchedule` e ViewSet RESTful para consulta e parametrização dinâmica da agenda corporativa. |
| `_reversa_sdd/architecture.md` | `backend/google_service` | `regra-alterada` | `GoogleCalendarService` com leitura prioritária do Calendar ID em banco e método `testar_conexao()` com healthcheck ativo e cálculo de latência. |
| `_reversa_sdd/architecture.md` | `frontend/pages` | `componente-novo` | Páginas `PerfilPage.tsx` na rota `/perfil` e `ConfiguracoesSistemaPage.tsx` na rota `/admin/configuracoes/sistema`. |
| `_reversa_sdd/architecture.md` | `frontend/layout` | `componente-alterado` | Dropdown de usuário no `Header.tsx` atualizado com links "Meu Perfil" e "Configurações do Sistema" condicionado a Gerente Empresa. |
| `_reversa_sdd/architecture.md` | `frontend/contracts` | `delta-de-contrato-externo` | Novos endpoints REST `/api/v1/schedule/configuracao/diagnostico/` (GET/PATCH) e `/testar-conexao/` (POST). |
| `_reversa_sdd/domain.md` | `schedule` | `regra-alterada` | **RN-01 de Schedule:** Parametrização dinâmica do Google Calendar ID corporativo pelo administrador via banco de dados e botão de inscrição canônica 1-clique para os usuários. |
| `_reversa_sdd/domain.md` | `accounts` | `regra-nova` | **RN-08:** Exibição de dados de perfil institucional em modo estritamente somente-leitura com atalho para a agenda de suporte. |

---

## Regras sob vigilância

- `W001`: Resolução prioritária do `calendar_id` a partir de `ConfiguracaoSchedule` antes do fallback de ambiente. Ver `_reversa_forward/008-config-google-calendar-profile/regression-watch.md`.
- `W002`: Bloqueio estrito de acesso de clientes a endpoints administrativos de configuração e teste de conexão da agenda. Ver `_reversa_forward/008-config-google-calendar-profile/regression-watch.md`.
- `W003`: Resiliência da Google API no diagnóstico em tempo real com timeout de 8 segundos e tratamento gracioso de exceções. Ver `_reversa_forward/008-config-google-calendar-profile/regression-watch.md`.
- `W004`: Imutabilidade cadastral do perfil pelo usuário final garantindo consistência com o Google Identity Services. Ver `_reversa_forward/008-config-google-calendar-profile/regression-watch.md`.

---

## Fontes

- `_reversa_forward/008-config-google-calendar-profile/requirements.md`
- `_reversa_forward/008-config-google-calendar-profile/roadmap.md`
- `_reversa_forward/008-config-google-calendar-profile/legacy-impact.md`
- `_reversa_forward/008-config-google-calendar-profile/regression-watch.md`
- `_reversa_forward/008-config-google-calendar-profile/actions.md`
- `_reversa_forward/008-config-google-calendar-profile/progress.jsonl`
