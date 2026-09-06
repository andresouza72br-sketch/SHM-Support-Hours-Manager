# Contratos de API — Módulo Schedule

## 1. Listagem de Agendamentos
`GET /api/v1/schedule/agendamentos/`

- **Permissão:** Usuário autenticado (Multi-tenant: Clientes enxergam apenas reuniões do seu `cliente_id`; Técnicos/Admins veem todas).
- **Filtros (Query Params):** `cliente`, `pedido`, `ciclo`, `status`, `tipo`, `data_inicio_apos`, `data_inicio_antes`.
- **Response 200:**
```json
[
  {
    "id": "c1f7a070-4d43-4f51-b0db-b873e8785123",
    "titulo": "Reunião de Alinhamento e Homologação",
    "tipo": "alinhamento",
    "status": "agendado",
    "data_inicio": "2026-09-10T14:00:00Z",
    "data_fim": "2026-09-10T14:45:00Z",
    "duracao_minutos": 45,
    "cliente_id": 1,
    "cliente_nome": "ACME Corporation",
    "organizador_id": 2,
    "organizador_nome": "André Souza",
    "google_meet_link": "https://meet.google.com/abc-defg-hij",
    "google_sincronizado": true
  }
]
```

---

## 2. Criação de Agendamento
`POST /api/v1/schedule/agendamentos/`

- **Permissão:** Usuário autenticado (Cliente só pode criar para o seu `cliente_id`).
- **Request Body:**
```json
{
  "cliente": 1,
  "titulo": "Reunião de Alinhamento Técnico",
  "descricao": "Apresentação dos ciclos em aberto.",
  "data_inicio": "2026-09-10T14:00:00Z",
  "duracao_minutos": 45,
  "tipo": "alinhamento",
  "pedido": 12,
  "ciclo": 4,
  "participantes": [
    {"nome": "Carlos Cliente", "email": "carlos@acme.com", "tipo": "cliente"}
  ],
  "sincronizar_google": true
}
```
- **Response 201:** `AgendamentoDetailSerializer` completo com link do Google Meet e 3 lembretes criados (`24h`, `30m`, `15m`).

---

## 3. Cancelamento de Agendamento
`POST /api/v1/schedule/agendamentos/{id}/cancelar/`

- **Permissão:** Usuário autenticado (Equipe técnica, Admin ou Organizador).
- **Request Body:**
```json
{
  "motivo": "Cancelado a pedido do cliente por conflito de agenda."
}
```
- **Response 200:** Objeto do agendamento atualizado com `status: "cancelado"`, `motivo_cancelamento` preenchido e registro gravado no `ForensicAuditService`.

---

## 4. Próxima Reunião Agendada
`GET /api/v1/schedule/agendamentos/proxima/`

- **Permissão:** Usuário autenticado.
- **Response 200:** Objeto do próximo agendamento ativo com `data_fim >= now` ou `null`.

---

## 5. Diagnóstico de Configuração Google Calendar
`GET /api/v1/schedule/configuracao/diagnostico/`

- **Permissão:** Autenticado (Clientes recebem dados sanitizados sem e-mail da SA).
- **Response 200:**
```json
{
  "calendar_id": "suporte-shm@empresa.com",
  "modo_operacao": "ativo",
  "service_account_configurada": true,
  "service_account_email": "shm-calendar@iam.gserviceaccount.com",
  "atualizado_em": "2026-09-06T10:00:00Z",
  "atualizado_por_nome": "André Souza"
}
```

---

## 6. Atualização de ID da Agenda Corporativa
`PATCH /api/v1/schedule/configuracao/diagnostico/`

- **Permissão:** Restrito a Administradores da Empresa (`EMPRESA_ADMIN` ou Superuser).
- **Request Body:**
```json
{
  "calendar_id": "novo-calendar-id@group.calendar.google.com"
}
```
- **Response 200:** Objeto atualizado com status da sincronização.

---

## 7. Teste de Conexão com a Google API
`POST /api/v1/schedule/configuracao/testar-conexao/`

- **Permissão:** Restrito a Administradores da Empresa (`EMPRESA_ADMIN`).
- **Response 200:**
```json
{
  "sucesso": true,
  "mensagem": "Comunicação com a API do Google Calendar estabelecida com sucesso.",
  "calendar_id": "suporte-shm@empresa.com",
  "events_encontrados": 4
}
```
