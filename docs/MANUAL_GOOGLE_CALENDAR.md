# Manual de Configuração, Gestão e Manutenção do Google Calendar (SHM 2.0)

> **Documento Oficial de Manutenção e Operação Técnica**  
> Módulo: Schedule / Google Calendar & Google Meet Integration  
> Sistema: SHM (Sistema Homologado de Manutenção e Suporte)

---

## 1. Visão Geral da Arquitetura

O sistema SHM integra-se ao Google Workspace / Google Calendar através de dois canais complementares:

```
+-------------------------------------------------------------------------------+
|                                 USUÁRIO SHM                                   |
|   (Gerente, Técnico ou Cliente - ex: andresouza72br@gmail.com)                |
+---------------------------------------+---------------------------------------+
                                        |
       1. Login SSO (Identidade)        |        3. Convite por E-mail / Meet
       (Google OAuth 2.0 Client ID)     |        (Recebe .ics e link na caixa)
                                        v
+---------------------------------------+---------------------------------------+
|                              SISTEMA SHM                                      |
|                                                                               |
|  +------------------------+             +----------------------------------+  |
|  |  Schedule Service      |             |  Configuração Schedule           |  |
|  |  (Criação de reunião)  |             |  (calendar_id persistido no DB)  |  |
|  +-----------+------------+             +-----------------+----------------+  |
+--------------|--------------------------------------------|-------------------+
               |                                            |
               | 2. Cria evento corporativo                 |
               v (via API REST v3)                          |
+-----------------------------------------------------------v-------------------+
|                        GOOGLE CLOUD PLATFORM                                  |
|                                                                               |
|  Service Account (Bot Corporativo)                                            |
|  - Possui chave privada (JSON) configurada no backend                         |
|  - Acessa a Agenda Corporativa com permissão "Fazer alterações nos eventos"  |
|  - Gera salas de conferência Google Meet automaticamente                      |
|  - Dispara convites aos participantes via Google Calendar API                 |
+-------------------------------------------------------------------------------+
```

### Principais Diferenças:
1. **Google Identity SSO:** Utilizado pelo usuário final para autenticação rápida (login social). Não concede permissão de leitura/escrita na agenda do usuário para o servidor por privacidade.
2. **Service Account (Conta de Serviço):** Identidade autônoma do Google Cloud (robô do SHM) que roda no backend em segundo plano, responsável por criar, atualizar e cancelar compromissos corporativos na agenda central da empresa.
3. **Inscrição 1-Clique (`google_subscribe_url`):** Atalho opcional para que administradores e colaboradores assinem a agenda da empresa no seu Google Agenda pessoal sem precisar configurar credenciais.

---

## 2. Passo a Passo de Configuração Inicial no Google Cloud

### Etapa 1: Acessar ou Criar Projeto no Google Cloud Console
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Selecione o projeto existente do SHM ou crie um novo projeto (ex: `shm-agenda-corporativa`).

### Etapa 2: Ativar a Google Calendar API
1. No menu lateral do Google Cloud, navegue até **APIs e Serviços** > **Biblioteca**.
2. Pesquise por **Google Calendar API**.
3. Clique em **Google Calendar API** e depois no botão **Ativar** (*Enable*).

### Etapa 3: Criar a Service Account (Conta de Serviço)
1. Navegue até **APIs e Serviços** > **Credenciais**.
2. Clique no topo em **+ Criar Credenciais** > **Conta de serviço** (*Service Account*).
3. Preencha os dados:
   - **Nome da conta de serviço:** `shm-calendar-bot` (ou nome de sua preferência).
   - **ID da conta de serviço:** gerado automaticamente (ex: `shm-calendar-bot@seu-projeto.iam.gserviceaccount.com`).
   - **Descrição:** `Bot de integração de agendamentos e reuniões SHM`.
4. Clique em **Criar e Continuar**.
5. Papel no projeto: não é necessário conceder papéis de administração no Cloud IAM para a Service Account se ela for interagir apenas com a agenda compartilhada (pode deixar em branco ou atribuir *Leitor básico*). Clique em **Concluir**.

### Etapa 4: Gerar e Baixar a Chave Privada (JSON)
1. Na lista de Contas de Serviço, clique sobre o e-mail da Service Account criada (`...iam.gserviceaccount.com`).
2. Acesse a aba **Chaves** (*Keys*).
3. Clique em **Adicionar Chave** > **Criar nova chave**.
4. Selecione o tipo **JSON** e clique em **Criar**.
5. O download do arquivo `.json` de credenciais será iniciado automaticamente.
   > ⚠️ **Atenção:** Guarde esse arquivo com segurança. Ele contém as credenciais criptográficas privadas de acesso.

---

## 3. Configuração da Agenda no Google Calendar (Crucial)

Para que a Service Account tenha permissão de criar e gerenciar reuniões, **a agenda deve ser compartilhada com ela**:

1. Acesse o [Google Calendar Web](https://calendar.google.com/) com a conta corporativa que gerencia a agenda (ex: conta do administrador).
2. Se desejar usar uma agenda dedicada (recomendado):
   - No menu lateral esquerdo, em **Outras agendas**, clique no botão `+` > **Criar nova agenda**.
   - Nomeie como **Agenda Corporativa SHM** ou **Suporte SHM**.
3. Clique nos três pontinhos ao lado do nome da agenda > **Configurações e compartilhamento**.
4. Localize a seção **Compartilhar com pessoas ou grupos específicos**:
   - Clique em **+ Adicionar pessoas e grupos**.
   - Cole o **e-mail da Service Account** (ex: `shm-calendar-bot@seu-projeto.iam.gserviceaccount.com`).
   - No campo *Permissões*, selecione obrigatoriamente:  
     👉 **"Fazer alterações nos eventos"** (*Make changes to events*).
   - Clique em **Enviar**.
5. Na mesma tela de configurações, role até a seção **Integrar agenda**:
   - Copie o **ID da agenda** (*Calendar ID*).
   - Exemplo de formato:
     - Agenda dedicada: `c_xxxxxxxxxxxxxxxxxxxxxxxxxx@group.calendar.google.com`
     - Agenda primária de uma conta: `email@suaempresa.com.br` ou `andresouza72br@gmail.com`.

---

## 4. Configuração no SHM

### Opção A: Configuração via Painel Web (Recomendada para o Calendar ID)
1. Faça login no SHM como **Empresa • Gerente** ou Administrador.
2. Acesse o menu **Configurações do Sistema** (`/configuracoes`).
3. No campo **ID da Agenda Corporativa (GOOGLE_CALENDAR_ID)**, cole o ID da agenda copiado no passo anterior.
4. Clique em **Salvar Configuração**. O valor é salvo no banco de dados (`shm_configuracao_schedule`).

### Opção B: Configuração das Credenciais no Backend (`.env`)
No arquivo `.env` do backend (`schedule/backend/.env` ou raiz do projeto):

```env
# Método 1: Caminho relativo ou absoluto do arquivo JSON baixado do Google Cloud
GOOGLE_SERVICE_ACCOUNT_FILE=credentials/google-service-account.json

# OU Método 2: O conteúdo JSON direto em uma única linha (ideal para Docker/Render/Heroku/K8s)
# GOOGLE_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "...", ...}

# ID da Agenda padrão (fallback se não houver no banco)
GOOGLE_CALENDAR_ID=c_xxxxxxxxxxxx@group.calendar.google.com
```

---

## 5. Procedimento de Teste e Validação (Diagnóstico em Tempo Real)

1. Na tela **Configurações do Sistema** (`/configuracoes`):
2. Verifique o **Modo de Operação**:
   - **Service Account Ativa (Verde):** Credenciais reconhecidas e carregadas pelo backend.
   - **Simulação / Mock (Amarelo):** Chave JSON ausente ou inválida. O sistema operará em simulação, gerando links fictícios sem quebrar a criação de chamados.
3. Clique no botão **"Testar Comunicação com Google API"**:
   - O backend enviará uma requisição de health check ativa com timeout de 8 segundos.
   - Se retornar **Conexão Estabelecida (Verde)**, a latência (ex: 215 ms), nome da agenda e papel de acesso serão exibidos.

---

## 6. Guia de Resolução de Problemas (Troubleshooting)

| Sintoma / Erro | Causa Mais Provável | Ação de Correção |
| :--- | :--- | :--- |
| **Status "Simulação (Dev / Mock)"** | Variável `GOOGLE_SERVICE_ACCOUNT_FILE` ou `GOOGLE_SERVICE_ACCOUNT_JSON` não configurada no `.env` do backend. | Verifique se o arquivo JSON existe no caminho especificado e se o backend tem permissão de leitura. Reinicie o backend. |
| **Erro HTTP 404 (Not Found) no teste** | O `calendar_id` informado não existe ou está com caracteres extras/espaços. | Copie novamente o **ID da agenda** nas configurações da agenda do Google Calendar e cole no campo de configuração. |
| **Erro HTTP 403 (Forbidden) no teste** | A agenda corporativa **não foi compartilhada** com a Service Account ou tem permissão insuficiente. | No Google Calendar, acesse *Configurações da Agenda* > *Compartilhar* > adicione o e-mail da Service Account com **"Fazer alterações nos eventos"**. |
| **Erro ao gerar conferência Google Meet** | Contas gratuitas comuns (@gmail.com) não autorizam criação de sala via Service Account sem domínio Google Workspace. | O SHM possui fallback automático inteligente: se a API recusar `conferenceData`, o backend gera automaticamente um link seguro no padrão `https://meet.google.com/shm-xxx-yyyy`. |
| **Timeout de 8 segundos excedido** | Bloqueio de rede externa, firewall corporativo ou proxy bloqueando `www.googleapis.com:443`. | Verifique se o servidor onde o backend está rodando tem saída liberada para `https://www.googleapis.com`. |

---

## 7. Como os Usuários do SHM Usam a Agenda

- **Clientes e Técnicos:** Não precisam configurar nenhuma credencial. Ao agendar uma visita ou reunião, recebem o convite padrão do Google no e-mail cadastrado.
- **Gerentes / Administradores:** Podem clicar no botão **"Inscrever no Google Calendar"** no seu perfil (`/perfil`) para adicionar a agenda corporativa compartilhada em sua grade pessoal do app Google Agenda no celular e desktop.
