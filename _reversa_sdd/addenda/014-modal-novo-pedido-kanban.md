# Adendo de Convergência SDD — Feature 014: Modal de Abertura de Novo Pedido no Dashboard Kanban

> **Identificador:** `014-modal-novo-pedido-kanban`  
> **Data:** `2026-11-18`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-11-18.

## Resumo da entrega

Foi implementada a abertura de novas demandas técnicas diretamente em janela modal sobreposta ao Painel Kanban na página principal (`DashboardPage.tsx`), eliminando a quebra de contexto operacional causada pelo redirecionamento de tela anterior para `/pedidos/novo`.

O novo componente `NovoPedidoModal.tsx` (`frontend/src/components/pedidos/`) foi concebido em total conformidade com a identidade visual *"The Forensic Vault"*, padronizando a experiência com os demais modais do sistema (`NovoClienteModal`, `NovoContratoModal` e `ModalAgendamento`). O modal herda e pré-seleciona automaticamente o contrato ativo em foco no dashboard, exibe o saldo de horas disponível e garante paridade funcional estrita com as regras de negócio canônicas de pedidos: seleção de prioridade em 4 níveis (Baixa, Média, Alta, Urgente), área de dropzone para até 10 arquivos (limite de 25 MB por anexo), gravação de instruções de voz em tempo real via microfone em formato MP3 (`GravadorAudio.tsx`) e salvaguarda contra descarte acidental com diálogo de confirmação.

No Kanban (`KanbanBoard.tsx`), o botão "Novo Pedido" foi ajustado para emitir o evento `onNovoPedidoClick` sem trocar de página. A `DashboardPage.tsx` orquestra o ciclo de vida do modal, captura requisições de abertura via URL (`/dashboard?novo=true`) e realiza a invalidação reativa imediata das chaves `kanban` e `contratos` no React Query após a gravação, refletindo o novo card instantaneamente na coluna "Abertos" e emitindo notificação Toast com o protocolo gerado. A rota legada `/pedidos/novo` foi atualizada para redirecionar para `/dashboard?novo=true`, preservando a integridade de links externos e favoritos.

Total de 9 ações atômicas concluídas com sucesso (T001 a T009), compilação de produção validada via Docker (`tsc && vite build`) e container `shm-frontend` atualizado em ambiente local (`http://shm.home`).

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|:---:|---|
| `_reversa_sdd/architecture.md` | `frontend/components/pedidos` | `componente-novo` | Criação de `NovoPedidoModal.tsx` com formulário completo, dropzone de anexos, gravação de áudio MP3 e trava contra descarte acidental. |
| `_reversa_sdd/architecture.md` | `frontend/components/kanban` | `regra-alterada` | Botão "Novo Pedido" em `KanbanBoard.tsx` passa a emitir `onNovoPedidoClick()` abrindo o modal sobreposto ao painel. |
| `_reversa_sdd/architecture.md` | `frontend/pages/DashboardPage` | `regra-alterada` | Orquestração do modal, repasse do contrato selecionado e detecção do parâmetro de busca `?novo=true`. |
| `_reversa_sdd/architecture.md` | `frontend/pages/NovoPedidoPage` | `regra-alterada` | Rota canônica `/pedidos/novo` redireciona para `/dashboard?novo=true` com abertura automática do modal. |
| `_reversa_sdd/domain.md` | `pedidos` | `regra-alterada` | **RN-PEDIDO-MODAL-01:** Abertura de chamados opera em modal sobreposto ao Kanban com foco contínuo e preservação dos filtros do painel. |
| `_reversa_sdd/domain.md` | `pedidos` | `regra-nova` | **RN-PEDIDO-MODAL-05:** Tentativa de fechamento com campos preenchidos exige confirmação explícita do operador contra descarte involuntário. |

## Regras sob vigilância

- `W001`: O botão "Novo Pedido" no Kanban deve acionar o modal `NovoPedidoModal` sobreposto sem navegar para outra página. Ver `_reversa_forward/014-modal-novo-pedido-kanban/regression-watch.md`.
- `W002`: A rota `/pedidos/novo` deve redirecionar para `/dashboard?novo=true`, abrindo o modal de forma compatível. Ver `_reversa_forward/014-modal-novo-pedido-kanban/regression-watch.md`.
- `W003`: Tentativa de fechar o modal com dados inseridos deve exigir confirmação contra descarte acidental. Ver `_reversa_forward/014-modal-novo-pedido-kanban/regression-watch.md`.

## Fontes

- `_reversa_forward/014-modal-novo-pedido-kanban/requirements.md`
- `_reversa_forward/014-modal-novo-pedido-kanban/roadmap.md`
- `_reversa_forward/014-modal-novo-pedido-kanban/data-delta.md`
- `_reversa_forward/014-modal-novo-pedido-kanban/legacy-impact.md`
- `_reversa_forward/014-modal-novo-pedido-kanban/regression-watch.md`
- `_reversa_forward/014-modal-novo-pedido-kanban/actions.md`
- `_reversa_forward/014-modal-novo-pedido-kanban/progress.jsonl`
