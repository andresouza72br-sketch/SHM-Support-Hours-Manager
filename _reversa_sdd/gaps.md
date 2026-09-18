# Lacunas Técnicas, Débitos e Roadmap de Evolução (Gaps & Roadmap)

> Gerado pelo **Reversa Reviewer** em 2026-09-18  
> Sistema: **SHM 2.5.3 (Support Hours Manager)**  
> Status: **0 LACUNAS BLOQUEANTES NO DOMÍNIO — SISTEMA 100% HOMOLOGADO** 🟢

---

## 1. Débitos Técnicos do Legado

| ID | Módulo | Severidade | Descrição da Lacuna | Status / Mitigação |
|---|---|:---:|---|---|
| **GAP-01** | `contratos` / `core` | Baixa | Armazenamento local de arquivos anexados (`MEDIA_ROOT`). | 🟢 Mitigado pela Feature 011: Storage Híbrido Local-First na VPS com espelhamento contínuo no Google Drive corporativo e hash SHA-256 em streaming. |
| **GAP-02** | `ciclos` | Baixa | Ausência de limitação de tentativas para Magic Link inválido. | Implementar rate limit por IP (ex: `django-ratelimit`) para mitigar tentativas de força bruta no endpoint público. |
| **GAP-03** | `saldo` | Média | Reversão de operações via estorno é manual. | Criar endpoint de estorno atômico vinculado ao `HistoricoSaldo` para auditabilidade direta. |
| **GAP-04** | `frontend` | Baixa | Bundle inicial do Vite pode ser otimizado via lazy-loading das 22 rotas. | Implementar `React.lazy()` e `Suspense` em rotas secundárias da SPA. |

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
| **FEAT-011** | Storage Híbrido Local-First na VPS com Espelhamento Google Drive | `core` / `contratos` | 🟢 Entregue & Homologado (`011-storage-hibrido-vps-drive`) |
| **FEAT-012** | Extrato Oficial do Contrato em PDF Dual-Engine (WeasyPrint/ReportLab) & Raio-X | `contratos` / `frontend` | 🟢 Entregue & Homologado (`012-extrato-contrato-weasyprint`) |
| **FEAT-013** | Branding Corporativo Singleton (Logotipo 5MB e Dados da Empresa) | `core` / `frontend` | 🟢 Entregue & Homologado (`013-branding-empresa-suporte`) |

---

## 3. Roadmap de Novas Funcionalidades (Backlog Futuro)

| ID | Módulo | Prioridade | Funcionalidade Futura | Descrição Técnica |
|---|---|:---:|---|---|
| **FEAT-ROAD-01** | `notificacoes` | Alta | Notificações via Telegram Bot | Integração com Telegram Bot API para envio de alertas de chamado e botões inline de aprovação rápida. |
| **FEAT-ROAD-02** | `notificacoes` | Média | Notificações via WhatsApp Business | Disparo de mensagens transacionais e links via WhatsApp Business API / Webhooks. |
| **FEAT-ROAD-05** | `core` | Baixa | Suporte a S3/MinIO adicional | Adaptador plugável alternativo para clientes que exigem storage AWS/MinIO em vez de Google Drive. |

