# Matriz de Permissões e Controle de Acesso (RBAC) — SHM 2.5.0

> Gerado pelo **Reversa Detective** em 2026-09-05  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**

---

| Módulo / Recurso | Ação / Endpoint | EMPRESA_ADMIN | EMPRESA_TECNICO | CLIENTE_GERENTE | CLIENTE_ANALISTA |
|---|---|:---:|:---:|:---:|:---:|
| **Accounts** | Gerenciar usuários e papéis | ✅ Total | ❌ Negado | ❌ Negado | ❌ Negado |
| **Accounts** | Login tradicional, Magic Link e OAuth | ✅ Permitido | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Clientes** | Criar, editar e excluir clientes | ✅ Total | 👁️ Visualizar | ❌ Negado | ❌ Negado |
| **Clientes** | Aprovar cadastro via Magic Link | ❌ (N/A) | ❌ (N/A) | ✅ Tomador | ❌ Negado |
| **Contratos** | Criar contrato e aditivos | ✅ Total | 👁️ Visualizar | ❌ Negado | ❌ Negado |
| **Contratos** | Aceitar contrato formalmente | ❌ (N/A) | ❌ (N/A) | ✅ Tomador | ❌ Negado |
| **Contratos** | Upload e exclusão de documentos | ✅ Total | 👁️ Download | 👁️ Download | ❌ Negado |
| **Contratos** | Baixar Extrato Oficial em PDF (`extrato_pdf`) | ✅ Permitido | 👁️ Permitido | ✅ Próprios | ❌ Negado |
| **Contratos** | Destinatários e disparo de extrato por e-mail | ✅ Permitido | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Contratos** | Gestão de e-mails de notificação | ✅ Total | ❌ Negado | 👁️ Visualizar | ❌ Negado |
| **Core / Branding**| Consultar identidade pública (`/branding/`) | ✅ Permitido | ✅ Permitido | ✅ Permitido | ✅ Permitido (Público) |
| **Core / Branding**| Parametrizar branding e mídias (`/admin/branding/`)| ✅ Total | ❌ Negado | ❌ Negado | ❌ Negado |
| **Pedidos** | Abrir chamado de suporte | ✅ Permitido | ✅ Permitido | ✅ Próprios | ✅ Próprios |
| **Pedidos** | Visualizar chamados | ✅ Todos | ✅ Todos | ✅ Próprios | ✅ Próprios |
| **Ciclos** | Criar ciclo e decompor pedido | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Apresentar orçamento técnico | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Aprovar ou rejeitar orçamento | ❌ Negado | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Ciclos** | Iniciar execução e apontar horas | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Solicitar aceite (com justificativa se > 30%) | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Conceder ou recusar aceite formal | ❌ Negado | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Ciclos** | Avaliar ciclo com nota 1-5 estrelas | ❌ Negado | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Saldo** | Consultar extrato e histórico de saldo | ✅ Todos | ✅ Todos | ✅ Próprios | ❌ Negado |
| **Saldo** | Reabastecer saldo de horas | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Saldo** | Transferir saldo entre contratos ativos | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Saldo** | Migrar saldo remanescente de vencidos | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Saldo** | Compensar saldo devedor anterior | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Schedule** | Criar agendamento de reunião | ✅ Permitido | ✅ Permitido | ✅ Própria Empresa | ✅ Própria Empresa |
| **Schedule** | Visualizar agenda e reuniões | ✅ Todos | ✅ Todos | ✅ Própria Empresa | ✅ Própria Empresa |
| **Schedule** | Reagendar ou cancelar reunião | ✅ Total | ✅ Total | 🟡 Próprios (como Organizador) | ❌ Negado |
| **Schedule** | Consultar próxima reunião (/proxima/) | ✅ Permitido | ✅ Permitido | ✅ Próprios | ✅ Próprios |
| **Auditoria Forense** | Consultar trilha forense e selo diário | ✅ Todos | 👁️ Todos | 👁️ Próprios | ❌ Negado |
| **Auditoria Forense** | Verificar integridade matemática da cadeia | ✅ Permitido | ✅ Permitido | ✅ Próprios | ❌ Negado |
| **Documentação** | Laudo técnico oficial e Verificador Offline | ✅ Permitido | ✅ Permitido | ✅ Permitido | ✅ Acesso Aberto / Público |
| **Notificações** | Configurar regras, canais e supressão para autor | ✅ Total | ❌ Negado | ❌ Negado | ❌ Negado |
| **Notificações** | Receber alertas in-app e e-mail | ✅ Habilitado* | ✅ Habilitado* | ✅ Habilitado* | 🟡 Condicional* |

> *\* **Invariante do Autor:** Quando o usuário for o próprio autor que disparou a ação, o alerta no sininho in-app é suprimido incondicionalmente, e o disparo de e-mail respeita o toggle `nao_enviar_autor` configurado para o evento.*
> *\* **Acesso Pericial Aberto:** A rota `/publico/auditoria-forense` e o download do script autônomo offline em Python 3 puro não exigem login para permitir perícias técnicas e policiais em cumprimento à ISO/IEC 27037.*
