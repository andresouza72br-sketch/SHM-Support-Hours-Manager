# Requisitos do Módulo Schedule (Agendamento de Reuniões e Google Meet)

> Gerado pelo **Reversa Writer** em 2026-09-05  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Módulo corporativo de agendamento e gerenciamento de reuniões técnicas de suporte do SHM. Integra compromissos aos clientes contratantes e contextos de atendimento (Pedidos, Ciclos e Tarefas), gerando automaticamente links de salas Google Meet através da API do Google Calendar, programando lembretes automáticos escalonados e mantendo trilha de auditoria forense criptográfica em caso de cancelamentos e alterações.

## 2. Requisitos Funcionais
- **RF-SCH-01 (Must):** Criação de agendamentos (`Agendamento`) com data/hora de início obrigatória no futuro, cálculo automático de `data_fim` com base em `duracao_minutos` (padrão 45 min) e associação obrigatória a um `Cliente` 🟢.
- **RF-SCH-02 (Should):** Vinculação contextual opcional a `Pedido` (chamado OS), `Ciclo` técnico ou `Tarefa` de apontamento 🟢.
- **RF-SCH-03 (Must):** Classificação do compromisso por `TipoEventoSchedule` (`alinhamento`, `orcamento`, `homologacao`, `suporte_emergencial`, `avulso`) e status (`agendado`, `em_andamento`, `realizado`, `cancelado`) 🟢.
- **RF-SCH-04 (Must):** Integração com Google Calendar (`GoogleCalendarService`) provisionando ID de evento remoto e link público direto da sala virtual Google Meet (`google_meet_link`), armazenados de forma persistente 🟢.
- **RF-SCH-05 (Must):** Gestão de participantes (`ParticipanteAgendamento`) vinculados a usuários do sistema ou convidados externos via e-mail, registrando papel (`organizador`, `tecnico`, `cliente`, `convidado`) e status de presença (`pendente`, `confirmado`, `recusado`) 🟢.
- **RF-SCH-06 (Must):** Programação automática de 3 marcos temporais de lembretes (`LembreteAgendamento`): 24 horas, 30 minutos e 15 minutos antes da reunião 🟢.
- **RF-SCH-07 (Must):** Rotina idempotente de processamento de lembretes pendentes (`processar_lembretes_pendentes()`), disparando e-mails com botão de acesso à sala e notificações in-app para os participantes 🟢.
- **RF-SCH-08 (Must):** Governança declarativa de notificações via evento `SCHEDULE_AGENDAMENTO_CRIADO`, respeitando a supressão de auto-alerta no sininho in-app para o organizador 🟢.
- **RF-SCH-09 (Must):** Registro obrigatório de justificativa em cancelamentos e gravação de evento indelével no `ForensicAuditService` integrado à cadeia RFC 8785 🟢.
- **RF-SCH-10 (Must):** Isolamento Multi-Tenant estrito no `AgendamentoViewSet`: clientes só acessam reuniões de sua organização, enquanto a equipe técnica e administrativa possui visão global ou filtrada 🟢.
-**RF-SCH-11 (Should):** Endpoint `/api/v1/schedule/proxima/` retornando o próximo compromisso ativo do usuário logado para exibição destacada no dashboard 🟢.
- **RF-SCH-12 (Must):** Parametrização centralizada do Calendar ID e Service Account corporativa através de singleton `ConfiguracaoSchedule`, com endpoints de diagnóstico e teste de conexão restritos a administradores 🟢.

## 3. Critérios de Aceitação (Gherkin)

### Cenário 1: Agendamento bem-sucedido com Google Meet
- **Dado** que um técnico autenticado deseja agendar uma reunião de alinhamento para amanhã às 14:00,
- **Quando** ele submete o formulário com cliente, título, duração e `sincronizar_google=True`,
- **Então** o sistema cria o registro com status `agendado`,
- **E** gera o link `google_meet_link`,
- **E** cria 3 lembretes pendentes (24h, 30m, 15m),
- **E** dispara e-mail com CTA para a sala sem enviar auto-notificação in-app ao organizador.

### Cenário 2: Cancelamento com auditoria
- **Dado** que uma reunião existente precisa ser cancelada,
- **Quando** o organizador envia `POST /api/v1/schedule/{id}/cancelar/` informando o motivo,
- **Então** o agendamento tem status atualizado para `cancelado`,
- **E** os lembretes pendentes são cancelados,
- **E** um evento forense indelével é registrado na trilha de auditoria do contrato/cliente.

### Cenário 3: Diagnóstico e Validação de Credenciais Google
- **Dado** que um administrador acessa a tela de configurações do sistema,
- **Quando** consulta o endpoint de diagnóstico ou clica em testar conexão,
- **Então** a API valida a conectividade da Service Account com a agenda do Google,
- **E** retorna o status operacional ("ativo" ou "simulacao") sem expor chaves privadas.

