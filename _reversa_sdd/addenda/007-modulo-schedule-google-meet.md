# Adendo de Convergência SDD — Feature 007: Módulo de Agendamento (Schedule) & Sincronização Google Calendar / Meet

> **Identificador:** `007-modulo-schedule-google-meet`  
> **Data:** `2026-09-05`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-05.
Superado pela re-extração de 2026-09-18.

## Resumo da entrega

Implementado o módulo de Agendamento (`apps.schedule`) focado no ciclo de atendimento do suporte técnico do SHM (Pedidos, Ciclos e Tarefas), com integração corporativa à Google Calendar API na agenda centralizada `suporte-SHM` via Service Account, geração automática de salas do Google Meet e envio de convites com participantes. O sistema conta com motor de lembretes idempotente em 3 marcos de antecedência (24 horas, 30 minutos e 15 minutos com CTA direto para a sala virtual), gatilhos contextuais com 1 clique nas telas operacionais (`AnalisePedidoPage.tsx` e `ExecucaoCicloPage.tsx`), widget dinâmico de próxima reunião com contagem regressiva nos Dashboards, e página completa da Agenda Geral (`SchedulePage.tsx` em `/schedule`) com abas de próximas reuniões, calendário mensal interativo e histórico consolidado.

Total de 15 ações atômicas concluídas com sucesso (T001 a T015), com 154/154 testes passando no `pytest` (17 testes específicos de schedule e zero regressões no legado) e compilação do frontend TypeScript validada com zero erros no `npm run build`.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.schedule` | `componente-novo` | Nova aplicação Django `apps.schedule` com models `Agendamento`, `ParticipanteAgendamento`, `LembreteAgendamento` e ViewSet RESTful. |
| `_reversa_sdd/architecture.md` | `backend/google_service` | `componente-novo` | `GoogleCalendarService` com autenticação via Service Account corporativa na agenda `suporte-SHM`, conferência Google Meet e resiliência offline. |
| `_reversa_sdd/architecture.md` | `backend/notificacoes` | `regra-alterada` | Inclusão de `AGENDAMENTO_*` na `TimelineEvent`, categoria `SCHEDULE` na `ConfiguracaoNotificacao` e management command `processar_lembretes_schedule`. |
| `_reversa_sdd/architecture.md` | `frontend` | `componente-novo` | `SchedulePage.tsx` na rota `/schedule`, `ModalAgendamento.tsx` reutilizável e `<ProximaReuniaoWidget />` integrado aos Dashboards. |
| `_reversa_sdd/architecture.md` | `frontend` | `componente-alterado` | `Header.tsx` atualizado com link "Agenda" para perfis Empresa e Cliente; `AnalisePedidoPage.tsx` e `ExecucaoCicloPage.tsx` com botões de 1 clique. |
| `_reversa_sdd/architecture.md` | `frontend` | `delta-de-contrato-externo` | Nova rota frontend `/schedule` e endpoint `/api/v1/schedule/agendamentos/` com ação `/proxima/`. |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-01:** Integração corporativa Google Calendar / Meet via Service Account centralizada sem atrito OAuth individual. |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-02:** SHM como Single Source of Truth e sincronização unidirecional (SHM → Google). |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-03:** Vínculo contextual com Pedido/Ciclo, duração padrão de 45 min e concorrência com salas virtuais independentes. |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-04:** Rastreabilidade e imutabilidade forense na `TimelineEvent` do chamado. |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-05:** Régua de lembretes idempotente em 3 marcos (24h, 30m, 15m), recálculo na remarcação e compatibilidade futura com canais instantâneos. |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-06:** Isolamento Multi-Tenant estrito no RBAC e permissão de cancelamento pelo Gestor do Cliente com justificativa. |
| `_reversa_sdd/domain.md` | `schedule` | `regra-nova` | **RN-07:** Registro de ata e deliberações pós-reunião com replicação na timeline do chamado. |

## Regras sob vigilância

- `W001`: Execução periódica do scheduler `processar_lembretes_schedule` sem concorrência ou duplicações. Ver `_reversa_forward/007-modulo-schedule-google-meet/regression-watch.md`.
- `W002`: Quotas e resiliência da API Google Calendar em caso de indisponibilidade momentânea da rede ou credenciais. Ver `_reversa_forward/007-modulo-schedule-google-meet/regression-watch.md`.
- `W003`: Isolamento multi-tenant garantindo que clientes não acessem agendamentos de terceiros. Ver `_reversa_forward/007-modulo-schedule-google-meet/regression-watch.md`.
- `W004`: Preservação da integridade da timeline forense e encadeamento SHA-256 de auditoria. Ver `_reversa_forward/007-modulo-schedule-google-meet/regression-watch.md`.

## Fontes

- `_reversa_forward/007-modulo-schedule-google-meet/requirements.md`
- `_reversa_forward/007-modulo-schedule-google-meet/roadmap.md`
- `_reversa_forward/007-modulo-schedule-google-meet/legacy-impact.md`
- `_reversa_forward/007-modulo-schedule-google-meet/regression-watch.md`
- `_reversa_forward/007-modulo-schedule-google-meet/actions.md`
- `_reversa_forward/007-modulo-schedule-google-meet/progress.jsonl`
