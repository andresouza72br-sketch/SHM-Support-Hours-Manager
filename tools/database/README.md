# 🗄️ Base de Dados de Testes Determinística — SHM 2.4

> Pasta dedicada à gestão, reset e semeadura da base de dados limpa e sem resíduos ("sem lixos") para baterias de testes manuais, homologação de fluxos e validação de regras de negócio.

---

## 🚀 Como Resetar e Recriar a Base Limpa

Basta executar o script em qualquer terminal:

```bash
./tools/database/reset_db.sh
```

Ou através do comando principal do projeto:

```bash
./dev.sh reset-db
```


### O que o script faz automaticamente:
1. Encerra com segurança processos que possam estar travando o SQLite (`db.sqlite3`).
2. Remove o banco físico antigo e limpa mídias/anexos residuais de testes passados.
3. Aplica todas as migrações Django (`migrate`) atualizadas do zero.
4. Executa a semeadura determinística via `seed_base_limpa.py`.
5. Garante IDs previsíveis (iniciando em 1), chaves estrangeiras íntegras e Ledger contábil perfeitamente equilibrado.

---

## 🔑 Usuários e Credenciais Oficiais

A base contém estritamente os **4 usuários oficiais**, integrados aos botões de **Acesso Rápido (1-Clique)** e à **Simulação de Google OAuth2**:

| Papel | Usuário | Senha | E-mail Oficial | Perfil & Responsabilidade |
|---|---|---|---|---|
| 🏢 **Empresa Admin** | `admin` | `admin123` | `admin@shm.local` | Gestão de contratos, orçamentação e visualização global de clientes. |
| 🛠️ **Empresa Técnico** | `tecnico` | `tecnico123` | `tecnico@shm.local` | Execução técnica, lançamento de tarefas e solicitação de aceite. |
| 👔 **Cliente Gerente** | `cligerente` | `cliente123` | `gerente@acme.com` | Gestor do contrato Acme Corp: **aprova orçamentos (A2)** e **concede aceite final com débito de horas (A3)**. |
| 🧑‍💻 **Cliente Analista** | `clianalista` | `cliente123` | `analista@acme.com` | Operacional da Acme Corp: abre solicitações e acompanha Kanban. |

---

## 📋 Entidades Criadas na Base Limpa

### 1. Cliente B2B
- **Razão Social:** `Acme Indústria e Comércio S/A` (`Acme Corp`)
- **CNPJ:** `12345678000195` (Ativo)

### 2. Contrato de Suporte Oficial
- **Número:** `CT-2026-0001`
- **Franquia:** `100.00h`
- **Saldo Inicial:** `100.00h`
- **Documento Técnico Assinado:** `Contrato_Prestacao_Servicos_Acme_2026.pdf` com hash SHA-256 autêntico e verificação pericial.
- **Ledger Contábil (`HistoricoSaldo`):** Registro de carga inicial de 100.00h com método `SISTEMA`, garantindo conciliação matemática no Extrato do Contrato.
- **Trilha de Auditoria Forense Encadeada (*Hash Chaining* — RN-10 a RN-16):**
  A base já nasce com a corrente criptográfica particionada (`contrato:1` e `cliente:1`) estritamente encadeada e matematicamente íntegra:
  1. **Elo #1 (Sequência 1):** Criação cadastral do contrato com Bloco Gênese (`0000000000000000000000000000000000000000000000000000000000000000`).
  2. **Elo #2 (Sequência 2):** Upload do contrato assinado com dispersão SHA-256 do arquivo PDF.
  3. **Elo #3 (Sequência 3):** Carga inicial de franquia no saldo (100.00h no livro-razão).
  4. **Selo Diário Ativo (`AuditDailySeal`):** Lavrado com digest SHA-256 consolidando os registros do dia.

---

## 🛡️ Auditoria Forense e Perícia Criptográfica em Testes

Quando você executa os cenários de teste na aplicação, a cadeia pericial evolui de forma contínua e inquebrável:

- **No Aceite Final da OS 01 (Fluxo A3):** Ao aprovar o aceite de 6.00h, o sistema debita as horas no saldo (`100.00h -> 94.00h`) e gera compulsoriamente o **Elo #4** na partição `contrato:1`, apontando seu `previous_hash` para o hash do Elo #3.
- **Autoverificação da Cadeia:** O script `reset_db.ps1` já roda automaticamente a verificação pericial matemática ao término da semeadura.
- **Comandos de Gerenciamento Pericial (CLI):**

```bash
# 1. Verificar integridade pericial de todas as partições:
python backend/manage.py audit_verify_integrity

# 2. Verificar integridade isolada da partição do contrato Acme:
python backend/manage.py audit_verify_integrity --contrato-id=1

# 3. Lavrar ou atualizar o selo diário consolidado das partições:
python backend/manage.py audit_seal_daily
```

---

### 3. Cenários de Teste Estruturados

| Protocolo | Status | Ciclo / Horas | Objetivo do Teste |
|---|---|---|---|
| **OS2026080001** | `AGUARDANDO_ACEITE` | Corretiva (8h estimadas / 6h realizadas) | **Fluxo A3:** Entrar como `gerente@acme.com` e testar o **Aceite Final** (via App ou Magic Link), confirmando o débito de 6h no saldo (`100h -> 94h`) e a inserção do **Elo #4** na corrente pericial criptográfica. |
| **OS2026080002** | `AGUARDANDO_APROVACAO` | Evolutiva (8h estimadas / 0h realizadas) | **Fluxo A2:** Entrar como `gerente@acme.com` e testar a **Aprovação de Orçamento** (via App ou Magic Link), liberando o chamado para `EM_EXECUCAO`. |
| **OS2026080003** | `ABERTO` | Sem ciclo ainda | **Fluxo Inicial:** Chamado novo recém-aberto pela analista, pronto para triagem e orçamentação pela equipe da empresa. |

