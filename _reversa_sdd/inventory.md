# Inventário do Sistema — SHM (Support Hours Manager)

> Gerado pelo **Reversa Scout** em 2026-09-04  
> Versão do Sistema: **SHM 2.5.0 (Features 001 a 006 incorporadas)**  
> Nível de Documentação: **Aguardando seleção**  

---

## 1. Visão Geral da Superfície

O **SHM (Support Hours Manager)** é um sistema web corporativo fullstack para governança, controle de horas técnicas em contratos de suporte, gestão contratual com trilha forense imutável (RFC 8785 / SHA-256), decomposição em ciclos atômicos, ledger append-only de saldo, matriz declarativa de notificações e aprovações sem atrito via Magic Links.

### Resumo Quantitativo
- **Linguagem Principal Backend:** Python 3.12+ (Django 5.2.17 + Django REST Framework 3.15.0)
- **Linguagem Principal Frontend:** TypeScript 5.7 / React 19.0 (Vite 6.1 + Tailwind CSS 3.4 + TanStack Query 5.66)
- **Total de Módulos Backend (Apps Django):** 11 apps (`accounts`, `clientes`, `contratos`, `pedidos`, `ciclos`, `tarefas`, `saldo`, `comunicacao`, `notificacoes`, `schedule`, `core`)
- **Total de Páginas Frontend:** 17 páginas React SPA (incluindo tela de agenda `SchedulePage`, gravador de áudio de anexos e laudo pericial)
- **Bancos de Dados Suportados:** SQLite (desenvolvimento / demo) e PostgreSQL 16 com gatilhos nativos C/PLpgSQL de imutabilidade (produção)
- **Testes Automatizados:** 22 suítes completas de testes no backend (`pytest` / `pytest-django`, cobrindo autenticação, migração de saldo, workflow de ciclos, governança de notificações, hash chaining, agendamento de reuniões e verificador offline)
- **Ferramentas e Scripts Auxiliares:** Ferramenta autônoma de verificação pericial offline em Python puro (`verificador_independente.py`), scripts de seed determinístico (`tools/database/`), mock server SMTP (`tools/mail-server/dev_mail_server.py`) e orquestrador de desenvolvimento (`dev.ps1` / `dev.bat`).

---

## 2. Estrutura de Diretórios e Módulos

```text
projeto-SHM/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Autenticação, Usuários customizados, RBAC (4 papéis), Magic Login e Google OAuth
│   │   ├── clientes/         # Gestão de Clientes (PF/PJ), Magic Link de Aprovação Cadastral, Auditoria
│   │   ├── contratos/        # Gestão de Contratos (CT-YYYY-NNNN), Aditivos, Hashes SHA-256, Trilha Forense, Notificações
│   │   ├── pedidos/          # Chamados de Suporte (OSYYYYMMNNNN), Protocolo Sequencial, Anexos com áudio MP3, Sincronização
│   │   ├── ciclos/           # Workflow de Ciclos (Orçamento, Execução, Aceite), Avaliação 1-5★, Trava de Tolerância (+30%), Anexos
│   │   ├── tarefas/          # Apontamento técnico de horas, vínculo com ciclo e recálculo atômico de saldo
│   │   ├── saldo/            # Ledger Imutável (HistoricoSaldo), Transferências entre Contratos, Reabastecimentos, Migração
│   │   ├── comunicacao/      # Threads de Comentários, Respostas em árvore, Reações de emoji, Anexos e Conversão em Tarefas
│   │   ├── notificacoes/     # Timeline de Eventos, Notificações In-App, E-mails, Configuração Declarativa e Supressão para o Autor
│   │   ├── schedule/         # Agendamento de Reuniões de Suporte, Google Meet, Alertas e Auditoria
│   │   └── core/             # BaseModel TimeStamped, Storage Híbrido Local-First + Google Drive (Service Account), Auditoria e RFC 7807
│   ├── config/               # Settings Django, URLs globais, Autenticação JWT, Swagger OpenAPI
│   └── tests/                # Suíte de testes automatizados (pytest): 22 arquivos de teste
│
├── frontend/
│   └── src/
│       ├── api/              # Cliente Axios configurado com interceptors JWT e endpoints de schedule
│       ├── components/       # Modais, Layout, Kanban, Ciclos, GravadorAudio, ModalAgendamento, ProximaReuniaoWidget
│       ├── contexts/         # AuthContext, ThemeContext, ToastContext
│       ├── pages/            # 17 Páginas SPA (Dashboard, SchedulePage, Clientes, Contratos, Extrato, DocumentacaoAuditoria, etc.)
│       ├── utils/            # Script verificador independente offline e utilitários de formatação
│       └── types/            # Interfaces estritas TypeScript (incluindo schedule.ts)
│
├── tools/                    # Utilitários de desenvolvimento e teste (mail server mock, seed determinístico de banco)
├── docs/                     # Especificações de API, Workflow e Regras de Negócio
└── _reversa_forward/         # Histórico de evolução e features (001 a 006 concluídas)
```

---

## 3. Módulos Identificados

| Módulo | Tipo | Responsabilidade Principal | Arquivos Chave |
|---|---|---|---|
| `accounts` | Backend App | Autenticação, RBAC (Empresa Gerente/Técnico, Cliente Gerente/Técnico), tokens JWT, Google OAuth e Magic Login | `models.py`, `views.py`, `serializers.py`, `backends.py` |
| `clientes` | Backend App | Cadastro PF/PJ com validação de CPF/CNPJ, Magic Link de auto-aprovação de cadastro e auditoria cadastral | `models.py`, `views.py`, `services.py` |
| `contratos` | Backend App | Gestão do ciclo de vida contratual, cálculo de consumo de franquia, aditivos, hashes de integridade SHA-256 e trilha forense encadeada (*Hash Chaining*) | `models.py`, `views.py`, `forensic_service.py`, `email_service.py` |
| `pedidos` | Backend App | Chamados de suporte, protocolo formal sequencial, vinculação com contratos, anexos multipart com suporte a MP3 e transições de status | `models.py`, `views.py`, `serializers.py` |
| `ciclos` | Backend App | Decomposição atômica do chamado (Orçamento, Execução, Aceite), trava de tolerância (+30%), anexos e avaliação 1-5 estrelas | `models.py`, `views.py`, `workflow.py` |
| `tarefas` | Backend App | Lançamento de horas realizadas pelos técnicos, recálculo em tempo real do ciclo e validação de excedentes | `models.py`, `views.py`, `services.py` |
| `saldo` | Backend App | Ledger financeiro *append-only*, registro indelével de débitos/créditos, migração de saldo residual e reconciliação atômica | `models.py`, `views.py`, `ledger.py` |
| `comunicacao` | Backend App | Mensagens e apontamentos em árvore, reações de emoji, anexos de evidências e conversão de mensagens em tarefas | `models.py`, `views.py` |
| `notificacoes` | Backend App | Motor declarativo de eventos, despacho por e-mail/in-app, central de configurações por usuário e supressão de notificações para o autor | `models.py`, `views.py`, `dispatcher.py` |
| `schedule` | Backend App | Agendamento de reuniões técnicas/alinhamento, integração com Google Calendar/Meet, lembretes automáticos e auditoria | `models.py`, `views.py`, `services.py`, `google_service.py` |
| `core` | Backend App | Infraestrutura compartilhada, classes abstratas base, handlers RFC 7807 e seeders de dados | `models.py`, `exceptions.py`, `views.py` |
| `frontend` | Frontend SPA | Interface web responsiva em React 19, dashboard, agendamento de reuniões, gravação de áudio, extrato com timeline forense e documentação pericial | `App.tsx`, `SchedulePage.tsx`, `GravadorAudio.tsx`, `ProximaReuniaoWidget.tsx` |

---

## 4. Entry Points e Configurações

- **Backend API:**
  - WSGI Entry: `backend/config/wsgi.py`
  - ASGI Entry: `backend/config/asgi.py`
  - CLI de Gerenciamento: `backend/manage.py`
  - URLs Principais: `backend/config/urls.py`
  - Settings Django: `backend/config/settings.py`
  - Pytest Config: `backend/pyproject.toml`
- **Frontend SPA:**
  - HTML Entry: `frontend/index.html`
  - React Root: `frontend/src/main.tsx`
  - Roteador Central: `frontend/src/App.tsx`
  - Vite Config: `frontend/vite.config.ts`
  - Tailwind Config: `frontend/tailwind.config.js`
- **Orquestração e Ambiente:**
  - Compose: `docker-compose.yml`
  - Backend Container: `backend/Dockerfile`
  - Dev Scripts: `dev.ps1` e `dev.bat`
