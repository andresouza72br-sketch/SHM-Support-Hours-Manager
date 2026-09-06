# Lacunas Técnicas, Débitos e Roadmap de Evolução (Gaps & Roadmap)

> Gerado pelo **Reversa Reviewer** em 2026-09-04  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**  
> Status: **0 LACUNAS BLOQUEANTES NO DOMÍNIO — SISTEMA 100% HOMOLOGADO** 🟢

---

## 1. Débitos Técnicos do Legado

| ID | Módulo | Severidade | Descrição da Lacuna | Recomendação |
|---|---|:---:|---|---|
| **GAP-01** | `contratos` | Média | Armazenamento local de arquivos anexados (`MEDIA_ROOT`). | Migrar para storage de objetos (S3 / Cloud Storage / MinIO) com presigned URLs seguras. |
| **GAP-02** | `ciclos` | Baixa | Ausência de limitação de tentativas para Magic Link inválido. | Implementar rate limit por IP (ex: `django-ratelimit`) para mitigar ataques de força bruta no endpoint público. |
| **GAP-03** | `saldo` | Média | Reversão de operações via estorno é manual. | Criar endpoint de estorno atômico vinculado ao `HistoricoSaldo` para auditabilidade direta. |
| **GAP-04** | `frontend` | Baixa | Bundle inicial do Vite pode ser otimizado via lazy-loading das 15 rotas. | Implementar `React.lazy()` e `Suspense` em todas as rotas filhas do router. |

---

## 2. Funcionalidades Entregues e Homologadas

| ID Original | Feature Implementada | Módulo | Status |
|---|---|:---:|:---:|
| **FEAT-ROAD-04** | Trava de Tolerância de +30% no aceite de ciclos | `ciclos` | 🟢 Entregue & Homologado (`001-trava-tolerancia-ciclos`) |
| **FEAT-ROAD-03** | Assistente de Migração e Aproveitamento de Saldo | `saldo` / `contratos` | 🟢 Entregue & Homologado (`002-migracao-saldo-contratos`) |
| **FEAT-003** | Supressão de Notificações para o Autor da Ação | `notificacoes` | 🟢 Entregue & Homologado (`003-nao-enviar-para-autor`) |
| **FEAT-004** | Anexos em Chamados, Ciclos e Comentários | `pedidos` / `comunicacao` | 🟢 Entregue & Homologado (`004-anexos-pedidos-ciclos-msgs`) |
| **FEAT-005** | Trilha Forense Imutável com Hash Chaining RFC 8785 | `contratos` / `core` | 🟢 Entregue & Homologado (`005-auditoria-hash-chaining`) |
| **FEAT-006** | Página de Documentação Pericial com TOC Flutuante e Scroll Suave | `frontend` | 🟢 Entregue & Homologado (`006-doc-auditoria-forense`) |
| **FEAT-007** | Módulo Schedule com Integração Google Calendar & Meet e Lembretes | `schedule` / `frontend` | 🟢 Entregue & Homologado (`007-modulo-schedule-google-meet`) |
| **FEAT-008** | Desacoplamento Consolidação Hash Chaining e Governança Notificações | `frontend` / `contratos` | 🟢 Entregue & Homologado (`008-desacoplamento-hash-chaining`) |

---


## 3. Roadmap de Novas Funcionalidades (Backlog Futuro)

| ID | Módulo | Prioridade | Funcionalidade Futura | Descrição Técnica |
|---|---|:---:|---|---|
| **FEAT-ROAD-01** | `notificacoes` | Alta | Notificações via Telegram Bot | Integração com Telegram Bot API para envio de alertas de chamado e botões inline de aprovação rápida. |
| **FEAT-ROAD-02** | `notificacoes` | Média | Notificações via WhatsApp Business | Disparo de mensagens transacionais e links via WhatsApp Business API / Webhooks. |
| **FEAT-ROAD-05** | `core` | Média | Storage Remoto S3/Cloud Storage | Adaptador plugável para upload de anexos e relatórios em buckets externos com URLs assinadas. |
