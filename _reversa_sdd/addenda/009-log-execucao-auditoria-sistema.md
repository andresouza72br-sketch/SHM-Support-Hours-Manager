# Adendo de Convergência SDD — Feature 009: Log de Execução Diária da Auditoria Forense nas Configurações do Sistema

> **Identificador:** `009-log-execucao-auditoria-sistema`  
> **Data:** `2026-09-06`  
> **Cenário:** `legado`  

---

## Vigência

Vigente desde 2026-09-06.

---

## Resumo da entrega

Disponibilizada a visualização e gestão operacional do log de execução diária da auditoria forense e selos noturnos de integridade (*Daily Seal*, RN-16) diretamente no painel administrativo de **Configurações do Sistema** (`/admin/configuracoes/sistema`). No backend (`apps.contratos`), foram criados dois novos endpoints RESTful protegidos para o perfil de Gerente/Administrador da Empresa (`IsEmpresaAdmin`):
1. `GET /api/v1/auditoria/selos_diarios/` (`AuditDailySealListView`): Histórico cronológico decrescente de selos de fechamento pericial lavrados, serializado via `AuditDailySealSerializer`, com suporte a filtros dinâmicos por partição e paginação/limite.
2. `POST /api/v1/auditoria/executar_diaria/` (`ExecutarAuditoriaDiariaView`): Gatilho manual para execução sob demanda da rotina de fechamento pericial (`ForensicAuditService.selar_particao_diaria`) e auditoria algorítmica de integridade (`ForensicAuditService.verificar_integridade_particao`) em todas as partições ativas de contratos, clientes e global, reportando laudo conclusivo com latência em milissegundos.

No frontend (`frontend/src/pages/ConfiguracoesSistemaPage.tsx`), foi implementada a nova seção **Auditoria Forense & Execução Diária**, contemplando 4 cartões de indicadores de conformidade (Status da Cadeia com percentual de integridade, Partições na Trilha, Total de Eventos Gravados, Último Selo Noturno), botão de disparo de execução sob demanda com estados de carregamento reativos, faixa de laudo em tempo real, barra de filtro/busca textual de partições e tabela de histórico com cópia rápida do digest SHA-256 e selo visual de autenticidade.

---

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.contratos` | `componente-novo` | Endpoints `AuditDailySealListView` e `ExecutarAuditoriaDiariaView` mapeados em `apps/contratos/urls_auditoria.py`. |
| `_reversa_sdd/architecture.md` | `frontend/pages` | `componente-alterado` | `ConfiguracoesSistemaPage.tsx` ampliada com seção dedicada ao log e operação dos selos diários de auditoria. |
| `_reversa_sdd/architecture.md` | `frontend/api` | `delta-de-contrato-externo` | `clientService.auditoria` enriquecido com `listarSelosDiarios` e `executarAuditoriaDiaria`. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-alterada` | **RN-16 (Fechamento Pericial Diário):** Disponibilização de controle interativo e visualização de evidências de integridade e fechamento em interface web administrativa. |

---

## Regras sob vigilância

- `W001`: Acesso estritamente restrito a `IsEmpresaAdmin` para visualização e disparo manual do fechamento diário.
- `W002`: Imutabilidade preservada: o fechamento diário consolida os registros existentes sem alterar a cadeia de custódia (*append-only*).