# 🏛️ Documento de Arquitetura do SHM 2.6 (Main Release 2.6 — Branding Corporativo & Governança Forense)

## 1. Visão Geral e Princípios Arquiteturais

O SHM 2.6 foi concebido seguindo os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** modular no Django e uma separação estrita entre o cliente Frontend (SPA) e a API Backend RESTful.

```mermaid
graph TD
    Client[React 19 SPA] <-->|JSON / JWT / OpenAPI| API[Django REST Framework]
    API --> Accounts[apps.accounts]
    API --> Clientes[apps.clientes]
    API --> Contratos[apps.contratos / ForensicAudit / Extratos PDF]
    API --> Pedidos[apps.pedidos]
    API --> Ciclos[apps.ciclos]
    API --> Tarefas[apps.tarefas]
    API --> Saldo[apps.saldo]
    API --> Comunicacao[apps.comunicacao]
    API --> Notificacoes[apps.notificacoes]
    API --> Schedule[apps.schedule]
    API --> Core[apps.core / Branding Singleton / Storage Híbrido Drive]
    
    Schedule <-->|OAuth / Meet API| GCalendar[Google Calendar & Meet]
    Core <-->|Service Account API| GDrive[Google Drive Cloud Storage]
    Saldo --> DB[(Database PostgreSQL / SQLite)]
    Contratos --> DB
    Pedidos --> DB
    Ciclos --> DB
    Schedule --> DB
    Core --> DB
```

---

## 2. Modelagem de Dados & ERD

```mermaid
erDiagram
    CONFIGURACAO_BRANDING {
        int id PK "pk=1 Singleton"
        string nome_empresa
        string razao_social
        string cnpj "Validação RFB"
        string logotipo "Upload até 5MB"
        string email_contato
        string telefone
        string site_oficial
    }

    EXTRATO_OFICIAL_GERADO {
        int id PK
        int contrato_id FK
        string motor_renderizacao "weasyprint / reportlab"
        string hash_sha256
        string arquivo_pdf
        decimal saldo_projetado_congelado
        datetime data_geracao
    }

    CLIENTE ||--o{ CONTRATO : "possui"
    CONTRATO ||--o{ EXTRATO_OFICIAL_GERADO : "emite extrato"
    CONTRATO ||--o{ PEDIDO : "vincula"
    PEDIDO ||--|{ CICLO : "decomposto em"
    CICLO ||--o{ TAREFA : "composto por"
    CONTRATO ||--o{ HISTORICO_SALDO : "registra ledger"
    CONTRATO ||--o{ FORENSIC_AUDIT_LOG : "fita dna encadeada"
    CONTRATO ||--o{ AUDIT_DAILY_SEAL : "selo diario noturno"
    CLIENTE ||--o{ AGENDAMENTO : "agenda reuniao"
    AGENDAMENTO ||--o{ LEMBRETE_AGENDAMENTO : "escalada de lembretes"
    CICLO ||--o{ COMENTARIO : "possui"
    PEDIDO ||--o{ TIMELINE_EVENT : "gera eventos"

    CLIENTE {
        int id PK
        string tipo "PF / PJ"
        string razao_social
        string cnpj
        string nome_completo
        string cpf
        string status "ativo / inativo"
    }

    CONTRATO {
        int id PK
        string numero UK "CT-YYYY-NNNN"
        date data_inicio
        date data_termino
        decimal horas_contratadas
        decimal saldo
        decimal horas_consumidas
        date data_fim_carencia
        string status "ativo / expirado"
    }

    PEDIDO {
        int id PK
        string protocolo UK "OSYYYYMMNNNN"
        string assunto
        string descricao
        string prioridade "baixa / media / alta / urgente"
        string status "aberto / em_execucao / concluido"
    }

    CICLO {
        int id PK
        int pedido_id FK
        string tipo "corretiva / evolutiva / etc"
        decimal horas_estimadas
        decimal horas_realizadas
        string status "orcado / aprovado / em_execucao / aceito"
        uuid token_acesso UK "Magic Link"
    }

    TAREFA {
        int id PK
        int ciclo_id FK
        string descricao
        decimal horas_estimadas
        decimal horas_realizadas
        string status "prevista / realizada"
    }

    HISTORICO_SALDO {
        uuid id PK
        int contrato_id FK
        string tipo_operacao "consumo / transferencia / reabastecimento"
        decimal quantidade
        decimal saldo_resultante
        string ip_origem
        string user_agent
        datetime criado_em
    }

    TRANSFERENCIA_SALDO {
        uuid id PK
        int contrato_origem_id FK
        int contrato_destino_id FK
        decimal quantidade
        string motivo
        datetime criado_em
    }

    CONTRATO_AUDIT_LOG {
        uuid id PK
        int contrato_id FK
        string tipo_evento "aceite / migracao_saldo / compensacao_debito"
        string descricao
        string justificativa
        string ip_origem
        string user_agent
        datetime criado_em
    }

    AVALIACAO_CICLO {
        uuid id PK
        int ciclo_id FK
        int nota "1 a 5 estrelas"
        string comentario
        datetime criado_em
    }

    FORENSIC_AUDIT_LOG {
        uuid id PK
        string particao UK "contrato:id"
        int sequencia UK "Monotonica 1..N"
        string hash_anterior "SHA-256 (64 hex)"
        string hash_atual "SHA-256 (64 hex)"
        string dados_payload "RFC 8785 Canonical JSON"
        string nivel_relevancia "CRITICA / OPERACIONAL"
        string tipo_evento
        string ip_origem
        string user_agent
        datetime timestamp "ISO-8601"
    }

    AUDIT_DAILY_SEAL {
        uuid id PK
        string particao UK
        date data_referencia UK
        string selo_digest "SHA-256"
        int total_eventos
        datetime gerado_em
    }

    AGENDAMENTO {
        uuid id PK
        int cliente_id FK
        int organizador_id FK
        string titulo
        datetime data_inicio
        datetime data_fim
        int duracao_minutos
        string google_event_id
        string google_meet_link
        string status "agendado / cancelado / realizado"
        string motivo_cancelamento
    }

    LEMBRETE_AGENDAMENTO {
        uuid id PK
        uuid agendamento_id FK
        string antecedencia "24h / 30m / 15m"
        datetime programado_para
        datetime disparado_em
        boolean enviado
    }
```

---

## 3. Diagrama de Sequência: Ciclo de Atendimento & Débito no Aceite

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 👤 Cliente (Gerente)
    participant Front as 💻 Frontend Web
    participant API as ⚙️ Backend API
    actor Tecnico as 🛠️ Técnico / Empresa
    participant Ledger as 📜 Ledger Saldo

    Cliente->>Front: Abre Pedido (OS2026080001)
    Front->>API: POST /api/v1/pedidos/
    API-->>Front: Pedido criado com status "Aberto"

    Tecnico->>API: POST /api/v1/ciclos/ (Decompõe em Ciclo Corretiva, 8h est.)
    Tecnico->>API: POST /api/v1/ciclos/{id}/apresentar_orcamento/
    Note over API: Pedido passa para "Aguardando Aprovação"

    Cliente->>Front: Aprova Orçamento (pelo painel ou Magic Link)
    Front->>API: POST /api/v1/ciclos/{id}/aprovar/
    Note over API,Ledger: ⚠️ SALDO PERMANECE INTACTO (0h debitadas)

    Tecnico->>API: POST /api/v1/ciclos/{id}/iniciar_execucao/
    Tecnico->>API: POST /api/v1/tarefas/ (Lança tarefa: 6h reais executadas)
    Tecnico->>API: POST /api/v1/ciclos/{id}/solicitar_aceite/

    Cliente->>Front: Concede Aceite Final do Ciclo
    Front->>API: POST /api/v1/ciclos/{id}/aceitar/
    API->>Ledger: SaldoService.consumir(6.00h reais)
    Ledger-->>API: Saldo Atualizado (100h - 6h = 94h)
    Note over API: Pedido atualizado para "Concluído"
    API-->>Front: Ciclo Aceito com Sucesso
```

---

## 4. Trilha de Auditoria Forense "DNA do Contrato" (Hash Chaining RFC 8785 / SHA-256)

A arquitetura de auditoria do SHM opera sob o conceito da **Fita de DNA Transacional**, onde cada contrato vigente possui sua própria partição contínua (`contrato:<id>`) garantindo imutabilidade matemática absoluta:

```mermaid
flowchart LR
    subgraph BlocoGenesis["Bloco 0 (Gênese)"]
        G1["previous_hash:<br><b>0000...0000 (64 zeros)</b>"]
        G2["hash_atual:<br><b>SHA-256(Gênese)</b>"]
    end

    subgraph Bloco1["Bloco 1 (Ex: Aceite Formal Ciclo #1)"]
        B1_P["previous_hash:<br><b>hash_atual(Bloco 0)</b>"]
        B1_C["payload_canonico:<br><b>RFC 8785 (JCS)</b>"]
        B1_H["hash_atual:<br><b>SHA-256(prev || payload)</b>"]
        B1_P --> B1_H
        B1_C --> B1_H
    end

    subgraph BlocoN["Bloco N (Ex: Migração de Saldo / Resgate)"]
        BN_P["previous_hash:<br><b>hash_atual(Bloco N-1)</b>"]
        BN_C["payload_canonico:<br><b>RFC 8785 (JCS)</b>"]
        BN_H["hash_atual:<br><b>SHA-256(prev || payload)</b>"]
        BN_P --> BN_H
        BN_C --> BN_H
    end

    subgraph Selo["Selo Diário (AuditDailySeal 23:59:59)"]
        S_D["selo_digest:<br><b>SHA-256(Estado Diário)</b>"]
    end

    BlocoGenesis --> Bloco1 --> BlocoN --> Selo
```

### Mecanismos de Blindagem Forense:
1. **Lock Pessimista por Partição (`select_for_update`):** Impede condições de corrida e bifurcações concorrentes na cadeia.
2. **Normalização RFC 8785 (JCS):** Garante ordenação lexicográfica e formatação decimal invariante, permitindo reprodutibilidade em qualquer linguagem.
3. **Gatilho Nativo PostgreSQL (`trg_forensic_audit_immutability`):** Rejeita operações de `UPDATE` e `DELETE` no motor do banco de dados.
4. **Selo Diário Noturno (`AuditDailySeal`):** Lavratura consolidada à meia-noite via `audit_seal_daily`.
5. **Timeline no Extrato (`TimelineAuditoriaContrato`):** Visualização ponto a ponto no frontend.

---

## 5. Módulo Schedule: Agendamento Técnico & Integração Google Meet

O módulo `apps.schedule` centraliza o alinhamento síncrono da equipe técnica com o cliente contratante:

```mermaid
sequenceDiagram
    autonumber
    actor Org as 👤 Organizador (Empresa / Técnico)
    participant Front as 💻 Frontend Web
    participant API as ⚙️ Backend (apps.schedule)
    participant Google as 🌐 Google Calendar API
    actor Part as 👥 Participantes (Cliente / Equipe)

    Org->>Front: Agenda Reunião Técnica (Contexto: Pedido/Ciclo)
    Front->>API: POST /api/v1/schedule/agendamentos/
    API->>Google: GoogleCalendarService.criar_evento()
    Google-->>API: Retorna google_meet_link e google_event_id
    API->>API: Persiste Agendamento + Cria 3 Lembretes (24h, 30m, 15m)
    API-->>Front: Agendamento Criado com Link Meet
    
    Note over API: Rotina Periódica: processar_lembretes_schedule
    API->>Part: Disparo Programado: E-mail HTML com CTA Meet + Notificação In-App
```

---

## 6. Documentação Pericial Oficial e Soberania Sem Caixa-Preta

Em consonância com a norma **ISO/IEC 27037** e a disciplina legal de **Cadeia de Custódia (CPP arts. 158-A a 158-F)**, o SHM disponibiliza:
- **Rota Pública Aberta:** [`/publico/auditoria-forense`](frontend/src/pages/DocumentacaoAuditoriaPage.tsx) para consulta de peritos judiciais e forças policiais sem login corporativo.
- **Utilitário Pericial Offline em Python Puro:** [`verificador_independente.py`](frontend/src/utils/verificador_script.ts) sem dependências externas (`pip`), projetado para análise pericial em estações *air-gapped*.
- **Comandos de Gerenciamento CLI:** `python manage.py audit_verify_integrity` e `python manage.py audit_seal_daily`.

---

## 7. Segurança & Controle de Acesso (RBAC)

O SHM 2.6 implementa 4 níveis de perfis de acesso:
1. **`EMPRESA_ADMIN`**: Acesso irrestrito a todos os clientes, gestão financeira de contratos, reabastecimentos, transferências e configuração de equipe.
2. **`EMPRESA_TECNICO`**: Acesso à fila operacional, triagem de pedidos, emissão de orçamentos, apontamento de tarefas e agendamento de reuniões técnicas.
3. **`CLIENTE_GERENTE`**: Tomador do contrato. Possui permissão para autorizar orçamentos, aprovar/recusar aceites finais, visualizar extratos financeiros e solicitar reuniões técnicas.
4. **`CLIENTE_ANALISTA`**: Usuário operacional do cliente. Pode abrir pedidos de suporte e interagir nos comentários dos ciclos.

---

## 8. Racional da Stack Tecnológica & Decisões Arquiteturais (ADR Synthesis)

Alinhado ao [**Manifesto de Engenharia SHM**](Manifesto/manifesto.md) e ao guia **SWEBOK**, cada elemento da stack foi selecionado para atuar como **fronteira de contenção (Agent Harness)**:

1. **Django 5.2 + DRF vs. Microframeworks**:
   - *Decisão*: Optou-se pelo Django devido à solidez do seu ORM transacional (`@transaction.atomic`), motor de migrações determinísticas e autenticação RBAC nativa.
   - *Ganho de Engenharia*: Impede que agentes de IA reinventem regras contábeis, garantindo consistência ACID no livro-razão `HistoricoSaldo`.
2. **React 19 + TypeScript 5.7 vs. JavaScript Puro**:
   - *Decisão*: Tipagem estrita ponta a ponta com interfaces compartilhadas.
   - *Ganho de Engenharia*: O compilador TypeScript atua como portão imediato de verificação pré-runtime, eliminando quebras de contrato de API.
3. **Reversa (SDD) & Impeccable (Craft UI/UX)**:
   - *Decisão*: Especificações vivas em `_reversa_sdd/` e heurísticas rigorosas de interface.
   - *Ganho de Engenharia*: Elimina o *Vibe Coding* e o débito técnico estético (*AI slop*), mantendo a evolução linear e previsível.
4. **Ferramental Dev Próprio (`tools/`)**:
   - *Decisão*: Servidor SMTP local (`dev_mail_server.py`) e orquestrador CLI (`dev.ps1`).
   - *Ganho de Engenharia*: Ambiente de testes 100% autossuficiente e offline, com custo zero de infraestrutura e privacidade total de dados em desenvolvimento.