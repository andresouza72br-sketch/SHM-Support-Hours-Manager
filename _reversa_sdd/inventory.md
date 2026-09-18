# Inventário do Sistema — SHM (Support Hours Manager)

> Gerado pelo **Reversa Scout** em 2026-09-18  
> Versão do Sistema: **SHM 2.6 (Release 2.6 Branding — Features 001 a 013 incorporadas)**  
> Nível de Documentação: **Detalhado**  

---

## 1. Visão Geral da Superfície

O **SHM (Support Hours Manager)** é um sistema web corporativo fullstack para governança, controle de horas técnicas em contratos de suporte, gestão contratual com trilha forense imutável (RFC 8785 / SHA-256), decomposição em ciclos atômicos, ledger append-only de saldo, matriz declarativa de notificações, agendamento de reuniões (Google Meet), storage híbrido (VPS + Google Drive), personalização visual corporativa (Branding) e emissão de Extrato Oficial em PDF vetorial de alta fidelidade.

### Resumo Quantitativo
- **Linguagem Principal Backend:** Python 3.12+ (Django 5.2.17 + Django REST Framework 3.15.0)
- **Linguagem Principal Frontend:** TypeScript 5.7 / React 19.0 (Vite 6.1 + Tailwind CSS 3.4 + TanStack Query 5.66)
- **Total de Módulos Backend (Apps Django):** 11 apps (`accounts`, `clientes`, `contratos`, `pedidos`, `ciclos`, `tarefas`, `saldo`, `comunicacao`, `notificacoes`, `schedule`, `core`)
- **Total de Páginas Frontend:** 22 páginas React SPA (incluindo `ExtratoContratoPage`, `ConfiguracoesBrandingPage`, `SchedulePage`, `LogHashChainingPage`, `DocumentacaoStoragePage`, `DocumentacaoAuditoriaPage`)
- **Bancos de Dados Suportados:** SQLite (desenvolvimento / demo) e PostgreSQL 16 com gatilhos nativos C/PLpgSQL de imutabilidade (produção)
- **Testes Automatizados:** 29 suítes completas de testes no backend (`pytest` / `pytest-django`, cobrindo autenticação, migração de saldo, workflow de ciclos, governança de notificações, hash chaining, agendamento de reuniões, storage híbrido Drive, extrato PDF WeasyPrint/ReportLab e branding)
- **Ferramentas e Scripts Auxiliares:** Ferramenta autônoma de verificação pericial offline em Python puro (`verificador_independente.py`), scripts de seed determinístico (`tools/database/`), mock server SMTP (`tools/mail-server/dev_mail_server.py`) e orquestrador de desenvolvimento (`dev.ps1` / `dev.bat`).

---

## 2. Estrutura de Diretórios e Módulos

```text
projeto-SHM/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Autenticação, Usuários customizados, RBAC (4 papéis), Magic Login e Google OAuth
│   │   ├── clientes/         # Gestão de Clientes (PF/PJ), Magic Link de Aprovação Cadastral, Auditoria, Google Drive
│   │   ├── contratos/        # Gestão de Contratos, Hashes SHA-256, Trilha Forense, Extrato Oficial PDF Vetorial (Dual-Engine)
│   │   ├── pedidos/          # Chamados de Suporte (OSYYYYMMNNNN), Protocolo Sequencial, Anexos com áudio MP3, Storage Híbrido
│   │   ├── ciclos/           # Workflow de Ciclos (Orçamento, Execução, Aceite), Avaliação 1-5★, Trava de Tolerância (+30%), Anexos
│   │   ├── tarefas/          # Apontamento técnico de horas, vínculo com ciclo e recálculo atômico de saldo
│   │   ├── saldo/            # Ledger Imutável (HistoricoSaldo), Transferências entre Contratos, Reabastecimentos, Migração
│   │   ├── comunicacao/      # Threads de Comentários, Respostas em árvore, Reações de emoji, Anexos e Conversão em Tarefas
│   │   ├── notificacoes/     # Timeline de Eventos, Notificações In-App, E-mails, Configuração Declarativa e Supressão para o Autor
│   │   ├── schedule/         # Agendamento de Reuniões de Suporte, Google Meet, Alertas e Auditoria
│   │   └── core/             # BaseModel TimeStamped, Storage Híbrido VPS/Drive, Branding Singleton (5MB/CNPJ), Auditoria RFC 8785
│   ├── config/               # Settings Django, URLs globais, Autenticação JWT, Swagger OpenAPI
│   └── tests/                # Suíte de testes automatizados (pytest): 29 arquivos de teste
│
├── frontend/
│   └── src/
│       ├── api/              # Cliente Axios configurado com interceptors JWT e endpoints de schedule/branding
│       ├── components/       # Modais, Layout, Kanban, Ciclos, GravadorAudio, ModalAgendamento, ProximaReuniaoWidget, EnviarExtratoModal
│       ├── contexts/         # AuthContext, ThemeContext, ToastContext
│       ├── pages/            # 22 Páginas SPA (Dashboard, Schedule, ExtratoContrato, Branding, Storage, Auditoria, etc.)
│       ├── utils/            # Script verificador independente offline e utilitários de formatação
│       └── types/            # Interfaces estritas TypeScript (incluindo schedule.ts, branding.ts, extrato.ts)
│
├── tools/                    # Utilitários de desenvolvimento e teste (mail server mock, seed determinístico de banco)
├── docs/                     # Especificações de API, Workflow e Regras de Negócio
└── _reversa_forward/         # Histórico de evolução e features (001 a 013 concluídas)
```

---

## 3. Módulos Identificados

| Módulo | Tipo | Responsabilidade Principal | Arquivos Chave |
|---|---|---|---|
| `accounts` | Backend App | Autenticação, RBAC (Empresa Gerente/Técnico, Cliente Gerente/Técnico), tokens JWT, Google OAuth e Magic Login | `models.py`, `views.py`, `serializers.py`, `backends.py` |
| `clientes` | Backend App | Cadastro PF/PJ com validação de CPF/CNPJ, Magic Link de auto-aprovação de cadastro, auditoria cadastral e integração Drive | `models.py`, `views.py`, `services.py` |
| `contratos` | Backend App | Gestão de contratos, aditivos, hashes SHA-256, trilha forense encadeada (*Hash Chaining*), Extrato Oficial PDF Vetorial (Dual-Engine WeasyPrint/ReportLab Platypus) e Raio-X de demandas em tempo real | `models.py`, `views.py`, `pdf_service.py`, `email_service.py`, `forensic_service.py` |
| `pedidos` | Backend App | Chamados de suporte, protocolo formal sequencial, vinculação com contratos, anexos multipart com suporte a MP3 e transições de status | `models.py`, `views.py`, `serializers.py` |
| `ciclos` | Backend App | Decomposição atômica do chamado (Orçamento, Execução, Aceite), trava de tolerância (+30%), anexos e avaliação 1-5 estrelas | `models.py`, `views.py`, `workflow.py` |
| `tarefas` | Backend App | Lançamento de horas realizadas pelos técnicos, recálculo em tempo real do ciclo e validação de excedentes | `models.py`, `views.py`, `services.py` |
| `saldo` | Backend App | Ledger financeiro *append-only*, registro indelével de débitos/créditos, migração de saldo residual e reconciliação atômica | `models.py`, `views.py`, `ledger.py` |
| `comunicacao` | Backend App | Mensagens e apontamentos em árvore, reações de emoji, anexos de evidências e conversão de mensagens em tarefas | `models.py`, `views.py` |
| `notificacoes` | Backend App | Motor declarativo de eventos, despacho por e-mail/in-app, central de configurações por usuário e supressão de notificações para o autor | `models.py`, `views.py`, `dispatcher.py` |
| `schedule` | Backend App | Agendamento de reuniões técnicas/alinhamento, integração com Google Calendar/Meet, lembretes automáticos e auditoria | `models.py`, `views.py`, `services.py`, `google_service.py` |
| `core` | Backend App | Infraestrutura compartilhada, classes abstratas base, Storage Híbrido Local-First + Google Drive, Singleton `ConfiguracaoBranding` (limite 5MB, validação CNPJ), RFC 7807 e seeders | `models.py`, `views.py`, `validators.py`, `drive_service.py` |
| `frontend` | Frontend SPA | Interface web responsiva em React 19 (22 páginas), dashboard, agendamento de reuniões, gravação de áudio, extrato com timeline forense e Raio-X, parametrização de branding e documentação pericial | `App.tsx`, `ExtratoContratoPage.tsx`, `ConfiguracoesBrandingPage.tsx`, `SchedulePage.tsx` |

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
