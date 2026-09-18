# Matriz de Impacto de Especificações (Spec Impact Matrix) — SHM 2.5.0

> Gerado pelo **Reversa Architect** em 2026-09-03  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**

---

| Componente Impactante | Componente Impactado | Tipo de Relação | Efeito / Comportamento do Impacto |
|---|---|---|---|
| `saldo` (Consumo) | `contratos` | Débito em Saldo | Reduz `contrato.saldo` e incrementa `contrato.horas_consumidas` de forma atômica |
| `saldo` (Consumo) | `notificacoes` | Disparo de Alerta | Dispara alerta automático de saldo ao ultrapassar 80% da franquia ou ao esgotar saldo |
| `saldo` (Migração) | `contratos` | Transferência Contábil | Transfere saldo de contrato vencido para novo contrato ativo com lock ordenado anti-deadlock |
| `ciclos` (Aceite) | `saldo` | Liquidação | Ao conceder aceite formal, invoca `SaldoService.consumir` debitando as horas reais executadas |
| `ciclos` (Tolerância +30%) | `notificacoes` | Alerta Operacional | Grava na timeline e alerta o gestor caso o ciclo exceda 30% das horas estimadas no orçamento |
| `tarefas` (Apontamento) | `ciclos` | Agregação Atômica | Salvar ou excluir uma tarefa recalcula e atualiza `ciclo.horas_realizadas` |
| `ciclos` (Transição de Status) | `pedidos` | Sincronização de Status | O status do pedido pai é recalculado a partir do estado coletivo dos ciclos |
| `contratos` (Upload Documento) | `contratos` (Auditoria) | Registro SHA-256 | Upload calcula hash SHA-256 e grava evento no `ContratoAuditLog` |
| `notificacoes` (Gatilho) | `accounts` / `contratos` | Resolução de Destinatários | `ConfiguracaoNotificacao` filtra e resolve destinatários consultando papéis RBAC e lista CC |
| `notificacoes` (Supressão Autor) | `accounts` / `notificacoes` | Filtro de Auto-Alerta | Expurga o autor logado de `destinatarios_in_app` (invariante do sininho) e de `destinatarios_usuarios`/`emails_cc` quando `nao_enviar_autor = True` |
| `contratos` (Operações Críticas) | `contratos` (Trilha Forense) | Carimbo Criptográfico | Qualquer aceite, alteração contratual, upload/exclusão de documento ou migração de saldo grava evento encadeado na partição com RFC 8785 e SHA-256 |
| `contratos` (Trilha Forense) | PostgreSQL (Database) | Bloqueio Nativo | Gatilho C/PLpgSQL `trg_forensic_audit_immutability` impede incondicionalmente comandos `UPDATE` e `DELETE` em nível de banco de dados |
| `frontend` (Documentação Pericial) | `frontend` (Navegação & Script) | UX / Soberania Pericial | Posiciona índice flutuante fixo centralizado na tela, executa rolagem calculada sem jitter e distribui script independente offline em Python 3 puro |
| `contratos` (Extrato Oficial) | `core` (Storage Híbrido & Drive) | Armazenamento & Espelhamento | Grava PDF no disco local da VPS sob hierarquia do cliente e despacha espelhamento assíncrono para pasta do Google Drive |
| `contratos` (Extrato Oficial) | `core` (Branding) | Identidade Visual Dinâmica | Injeta logotipo corporativo, dados cadastrais e rubrica digitalizada do representante legal no cabeçalho e encerramento pericial |
| `contratos` (Extrato Oficial) | `contratos` (Auditoria) | Carimbo SHA-256 | Calcula hash SHA-256 sobre os bytes compilados do PDF e grava registros em `ExtratoOficialGerado` e `ContratoAuditLog` |
| `core` (Branding) | `frontend` (Header & Telas) | Identidade Corporativa | Propaga dinamicamente logotipo, contatos e nome da empresa para a navbar e telas da SPA |


