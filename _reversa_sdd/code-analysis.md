# Análise Técnica Consolidada de Código (Code Analysis)

> Gerado pelo **Reversa Archaeologist** em 2026-09-06  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**  
> Escala de Confiança: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Visão Geral da Engenharia do Sistema

O SHM 2.5.0 é estruturado no padrão **Django Apps Modulares** no backend com arquitetura orientada a serviços desacoplados e transacionais, e **React 19 SPA com TypeScript e TanStack Query** no frontend.

### 1.1 Stack Tecnológico & Arquitetura
- **Backend:** Python 3.12+, Django 5.2, Django REST Framework 3.15, SimpleJWT 5.3 (Tokens rotativos), drf-spectacular 0.28 (OpenAPI 3.0), validate-docbr 2.0 (Validação matemática CPF/CNPJ).
- **Frontend:** React 19.0.0, TypeScript 5.7.3, Vite 6.1.0, Tailwind CSS 3.4.17, Axios 1.7.9, Lucide React 0.475, React Router 7.2.0, TanStack React Query 5.66.
- **Persistência:** SQLite3 (dev/local), PostgreSQL com psycopg2-binary (produção).
- **Segurança & Auditoria:** Hash SHA-256 para integridade documental, Magic Links criptográficos (UUIDv4) com expiração de 7 dias, Auditoria Forense em Clientes e Contratos, Ledger Imutável em Saldo com lock ordenado anti-deadlock.

---

## 2. Análise Detalhada por Módulo

### 2.1 Módulo `accounts` (Autenticação, RBAC e Tokens)
- **Modelos:** `User` (herda de `AbstractUser`), `PasswordlessLoginToken` 🟢.
- **Papéis de Acesso (RBAC):**
  1. `EMPRESA_ADMIN`: Gestão total de contratos, clientes, saldos, configurações de notificações e usuários.
  2. `EMPRESA_TECNICO`: Triagem operacional, estimativa de ciclos, apontamento de tarefas e execução técnica.
  3. `CLIENTE_GERENTE`: Tomador do contrato. Autoriza orçamentos, concede aceites finais, avalia ciclos e acessa extratos.
  4. `CLIENTE_ANALISTA`: Usuário solicitante. Abre pedidos de suporte e acompanha kanban.
- **Mecanismos de Autenticação:**
  - Login tradicional (usuário/senha via JWT com access e refresh tokens).
  - Magic Login sem senha: Gera `PasswordlessLoginToken` UUID de uso único com expiração.
  - Google OAuth: Validação de ID Token do Google via `google-auth` no endpoint `/api/v1/auth/google/` com vinculação ou auto-provisionamento.

### 2.2 Módulo `clientes` (Gestão de Organizações Tomadoras)
- **Modelos:** `Cliente` (PF/PJ), `ClienteAceiteLink`, `ClienteAuditLog` 🟢.
- **Regras de Negócio & Algoritmos:**
  - Validação estrita de CNPJ (14 dígitos, cálculo de dois dígitos verificadores por pesos) e CPF (11 dígitos, cálculo dos dígitos verificadores) via funções dedicadas `validar_cnpj` e `validar_cpf` 🟢.
  - Obrigatoriedade condicional: Se PJ, exige `razao_social` e `cnpj`. Se PF, exige `nome_completo` e `cpf` 🟢.
  - Magic Link de Aceite Cadastral (7 dias): Disparado para e-mail do tomador aprovar o cadastro e ativar a organização sem login prévio 🟢.
  - Auditoria Forense (`ClienteAuditLog`): Registra criação, alteração, aprovação por magic link e exclusão (com justificativa obrigatória, IP, user-agent e autor) 🟢.

### 2.3 Módulo `contratos` (Gestão Contratual, Vigência, Trilha Forense, Extrato Oficial e Selo Noturno)
- **Modelos:** `Contrato`, `ContratoDocumento`, `ContratoAuditLog`, `ForensicAuditLog`, `AuditDailySeal`, `AuditPartition`, `AceiteLink`, `ContratoEmailNotificacao`, `ContratoPDF`, `ExtratoOficialGerado` (Feature 012) 🟢.
- **Regras de Negócio & Algoritmos:**
  - Numeração padronizada `CT-YYYY-NNNN` 🟢.
  - Tipos: `novo`, `aditivo`, `renovacao`. Aditivos possuem FK recursiva `contrato_referencia` 🟢.
  - Carência de 30 dias (`data_fim_carencia`): Calculada na expiração do contrato. Durante a carência (`em_carencia = True`), o saldo positivo restante pode ser consumido em atendimentos de suporte sem bloqueio imediato 🟢.
  - Documentos & Integridade Criptográfica: Upload de arquivos gera hash SHA-256 (`hash_sha256`, `algoritmo_hash`) e endpoint de verificação `/verificar_integridade/` recalcula o hash do arquivo em disco e atesta integridade contra manipulação 🟢.
  - **Extrato Oficial de Contrato em PDF Vetorial & Raio-X em Tempo Real (Feature 012):**
    - Dual-Engine PDF: Compilação de alta fidelidade server-side via `WeasyPrint` (CSS Paged Media `@page` com cabeçalho/rodapé repetidos) e chaveamento automático para `ReportLab Platypus` em ambientes sem dependências GTK/GObject 🟢.
    - Raio-X Contínuo em Tempo Real (RN-08): Apura compulsoriamente todas as demandas em andamento (A2 orçamentos pendentes, chamados em execução e A3 entregas aguardando aceite) e calcula o Saldo Projetado Pós-Aceites com alerta visual de estouro de franquia 🟢.
    - Integridade Forense SHA-256: Todo binário PDF emitido tem seu hash calculado no encerramento, estampado no rodapé de todas as páginas e registrado em `ExtratoOficialGerado` e `ContratoAuditLog` (eventos `ENVIO_RELATORIO` e `ENVIO_MENSAL_RELATORIO`) 🟢.
    - Armazenamento Híbrido: Persistido na VPS sob `/media/clientes/{cliente_id}/contratos/{id}/extratos/` e espelhado para a pasta do cliente no Google Drive 🟢.
    - Despacho em Lote & Sob Demanda: Comando `enviar_extratos_mensais` no 1º dia útil de cada mês e modal interativo `EnviarExtratoModal.tsx` via endpoints `/api/v1/contratos/{id}/extrato_pdf/`, `/destinatarios_extrato/` e `/enviar_extrato_email/` 🟢.
  - **Trilha de Auditoria Forense com Hash Chaining (Feature 005):**
    - Modelo `ForensicAuditLog` (tabela `shm_forensic_audit_trail`): Registra eventos de criação, aceite, alteração, upload/download/exclusão de documentos e migrações contábeis.
    - Encadeamento Criptográfico: Cada registro armazena `previous_hash` e calcula `current_hash = SHA256(particao + sequencia + timestamp + evento + previous_hash + payload_hash)`.
    - Canonicalização RFC 8785 (JCS): `payload_hash` é gerado sobre o JSON determinístico sem espaços e com chaves estritamente ordenadas lexicograficamente.
    - Gatilhos Nativos PostgreSQL (`trg_forensic_audit_immutability`): Bloqueia incondicionalmente qualquer comando `UPDATE` ou `DELETE` em nível de banco (C/PLpgSQL).
    - Selo Diário Noturno (`AuditDailySeal`): Job diário consolida o estado de cada partição às 23:59:59 com `selo_digest` SHA-256 do último hash e total de transações.
    - Endpoints Periciais: `GET /api/v1/contratos/{id}/trilha_forense/` e `GET /api/v1/contratos/{id}/verificar_integridade_trilha/` para perícias e forças investigativas.
  - Gestão de E-mails de Notificação (`ContratoEmailNotificacao`): Destinatários adicionais convidados via token temporário com tela pública de opt-in (`ConfirmarNotificacaoPage`) 🟢.
  - QuerySets Especializados: `elegiveis_para_migracao` (saldo > 0, expirados ou vencidos) e `devedores` (saldo < 0) 🟢.
  - Auditoria Desacoplada: `ContratoService.notificar_e_auditar_migracao_saldo` e `notificar_e_auditar_compensacao_debito` para rastreabilidade de eventos contábeis 🟢.

### 2.4 Módulo `pedidos` (Chamados de Suporte, Anexos e Protocolos)
- **Modelos:** `Pedido`, `AnexoPedido` (Feature 004) 🟢.
- **Regras de Negócio & Algoritmos:**
  - Geração de protocolo sequencial atômico diário/mensal: `OSYYYYMMNNNN` (ex: `OS2026090001`) via `PedidoService.gerar_protocolo()` 🟢.
  - Agrupador de Ciclos: Um pedido não tem esforço direto; ele é decomposto em 1 ou mais ciclos técnicos 🟢.
  - Gestão de Anexos Multipart (`AnexoPedido`): Suporte a upload de evidências e especificações técnicas vinculadas ao chamado, com validação de tamanho e tipos de arquivo permitidos 🟢.
  - Sincronização Automática de Status (`PedidoService.sincronizar_status_pedido`): O status do pedido é recalculado automaticamente em cascata conforme os status dos seus ciclos (`aberto`, `em_orcamento`, `aguardando_aprovacao`, `em_execucao`, `aguardando_aceite`, `concluido`, `cancelado`) 🟢.

### 2.5 Módulo `ciclos` (Workflow Atômico, Orçamento, Trava de Tolerância, Anexos, Aceite e Avaliação)
- **Modelos:** `Ciclo`, `AnexoCiclo` (Feature 004), `CicloMagicLink`, `AvaliacaoCiclo` 🟢.
- **Classificação:** `corretiva`, `evolutiva`, `preventiva`, `analise`, `consultoria`, `treinamento`, `teste` 🟢.
- **Workflow Operacional:**
  1. Criação/Decomposição: Técnico define tipo e escopo (`orcado`).
  2. Apresentação de Orçamento: Técnico lança horas estimadas e emite Magic Link (`aguardando_aprovacao`).
  3. Aprovação pelo Cliente: Aprovação **não consome saldo** do contrato 🟢.
  4. Execução Técnica: Apontamento de tarefas e anexos de entrega (`AnexoCiclo`) pelo técnico (`em_execucao`).
  5. **Trava de Tolerância de Horas Excedentes (Feature 001):**
     - Função `CicloService.validar_tolerancia_horas`: calcula o teto de tolerância de +30% sobre o orçamento (`horas_estimadas * 1.30`).
     - Se `horas_realizadas > limite_tolerancia`, aciona bloqueio: exige justificativa técnica obrigatória de excedente ao solicitar aceite, gravando evidência na timeline e alertando gestores 🟢.
  6. Solicitação de Aceite: Técnico solicita aceite final (`aguardando_aceite`).
  7. Concessão de Aceite: Cliente concede aceite formal. O sistema debita **exclusivamente as horas reais realizadas** (`horas_realizadas`) no ledger de saldo do contrato 🟢.
  8. Avaliação de Satisfação (`AvaliacaoCiclo`): Rating de 1 a 5 estrelas e feedback textual registrado após o aceite 🟢.

### 2.6 Módulo `tarefas` (Apontamento Técnico de Horas)
- **Modelos:** `Tarefa` (status: `prevista`, `realizada`, `cancelada`) 🟢.
- **Regras de Negócio & Algoritmos:**
  - No método `save()` e `delete()` de `Tarefa`, o somatório de `horas_realizadas` de todas as tarefas com status `realizada` é recalculado e gravado atômicamente no campo `ciclo.horas_realizadas` 🟢.

### 2.7 Módulo `saldo` (Ledger Imutável, Migração de Saldo e Compensação de Débitos)
- **Modelos:** `HistoricoSaldo`, `TransferenciaSaldo`, `Reabastecimento` 🟢.
- **Regras de Negócio & Algoritmos:**
  - **Ledger Append-Only Imutável:** Todas as transações usam `select_for_update()` para isolamento e atomicidade ACID 🟢.
  - **Lock Ordenado Anti-Deadlock (`_obter_par_contratos_com_lock_ordenado`):** Em transferências ou migrações concorrentes entre contratos, os locks pessimistas são adquiridos em ordem lexicográfica determinística pelo ID, evitando deadlocks em cenários de alta concorrência 🟢.
  - **Migração de Saldo de Contratos Vencidos (Feature 002):** `SaldoService.migrar_saldo_contratos_vencidos` permite transferir saldo remanescente de contrato vencido/expirado para um novo contrato ativo do mesmo cliente, registrando lançamentos correlacionados no `HistoricoSaldo`, atualizando saldos e gravando no `ContratoAuditLog` e `ForensicAuditLog` 🟢.
  - **Compensação de Débito Anterior:** `SaldoService.compensar_debito_contrato_anterior` quita saldo devedor/negativo de contrato anterior deduzindo da franquia inicial do novo contrato ativo 🟢.
  - **Gatilhos Automáticos de Alerta:** Ao consumir saldo, se atingir 80% da franquia ou zerar/negativar o saldo, o `NotificacaoService.notificar_alerta_saldo` é disparado imediatamente 🟢.

### 2.8 Módulo `comunicacao` (Threads de Comentários, Anexos e Reações)
- **Modelos:** `Comentario`, `AnexoComentario` (Feature 004), `ReacaoComentario` 🟢.
- **Recursos:**
  - Threading em árvore: FK recursiva `parent` para respostas aninhadas 🟢.
  - Anexos em Mensagens (`AnexoComentario`): Compartilhamento de capturas de tela, logs e arquivos de evidência diretamente nas discussões do chamado 🟢.
  - Reações de emoji: Toggle atômico por usuário (`unique_together = [['comentario', 'autor', 'tipo']]`) 🟢.
  - Conversão em Tarefa: Endpoint `/converter_em_tarefa/` cria uma tarefa diretamente a partir de um comentário 🟢.

### 2.9 Módulo `notificacoes` (Timeline, Alertas, Central Declarativa e Supressão para o Autor)
- **Modelos:** `TimelineEvent`, `Notification`, `ConfiguracaoNotificacao` 🟢.
- **Recursos & Regras de Negócio:**
  - Timeline de auditoria com histórico cronológico de cada transição de pedido e ciclo 🟢.
  - Central Declarativa de Notificações (`ConfiguracaoNotificacao`): Suporte a 6 categorias de eventos (Autenticação, Clientes, Contratos, Saldo, Pedidos, Ciclos) com controles independentes de e-mail e in-app, além de matriz de destinatários por papel RBAC (`empresa_admin`, `empresa_tecnico`, `cliente_gerente`, `cliente_comum`, `gestor_contrato`, `emails_cc`) 🟢.
  - **Supressão Seletiva para o Autor da Ação (Feature 003):**
    - Campo booleano `nao_enviar_autor` no modelo `ConfiguracaoNotificacao` com `default=True` persistido via migração `0004_configuracaonotificacao_nao_enviar_autor.py` 🟢.
    - **Invariante Universal In-App:** O autor da ação conectado NUNCA recebe no sininho de notificações (`Notification`) alertas gerados por suas próprias ações (`destinatarios_in_app.discard(autor)`), blindando contra ruído e auto-notificações no app web ou mobile 🟢.
    - **Filtragem Declarativa de E-mail:** O método `NotificacaoConfigService.resolver_destinatarios_evento` expurga o autor da lista `destinatarios_usuarios` e elimina seu e-mail da lista de cópia (`emails_cc`) com normalização case-insensitive quando `nao_enviar_autor = True` 🟢.
    - **Calibragem Padrão dos 22 Eventos:** 14 eventos operacionais ativos por padrão (chamados, comentários, aprovações, orçamentos, aceite) e 8 inativos (convites de clientes, relatórios, ações de usuários) 🟢.
    - Serializer DRF `ConfiguracaoNotificacaoSerializer` expõe `nao_enviar_autor` permitindo atualização granular via PATCH por administradores da empresa 🟢.

### 2.10 Módulo `schedule` (Agendamento de Reuniões, Google Meet, Lembretes e Auditoria)
- **Modelos:** `Agendamento`, `ParticipanteAgendamento`, `LembreteAgendamento` 🟢.
- **Enums de Domínio:** `TipoEventoSchedule` (`alinhamento`, `orcamento`, `homologacao`, `suporte_emergencial`, `avulso`), `StatusAgendamento` (`agendado`, `em_andamento`, `realizado`, `cancelado`), `TipoParticipante` (`organizador`, `tecnico`, `cliente`, `convidado`), `MarcoLembrete` (`24h`, `30m`, `15m`), `StatusLembrete` (`pendente`, `enviado`, `ignorado`, `cancelado`, `falha`) 🟢.
- **Recursos & Regras de Negócio:**
  - Agendamento de compromissos técnicos atrelados a Cliente, com vínculo contextual opcional a Pedido (OS), Ciclo ou Tarefa 🟢.
  - **Integração Google Calendar & Meet (`GoogleCalendarService`):** Criação síncrona/assíncrona de eventos na API do Google Calendar, provisionando link direto para a sala Google Meet (`google_meet_link`) persistido no agendamento 🟢.
  - **Disparo de Lembretes Automáticos:** Criação determinística de 3 marcos (`24h`, `30m`, `15m` antes da reunião). O método `processar_lembretes_pendentes()` dispara notificações por e-mail e in-app quando `data_prevista <= timezone.now()` e marca `status=ENVIADO` 🟢.
  - **Governança de Notificações & Supressão para o Autor:** Totalmente acoplado ao `NotificacaoConfigService` com evento `SCHEDULE_AGENDAMENTO_CRIADO`, respeitando o toggle `nao_enviar_autor` para evitar auto-notificação in-app ao organizador 🟢.
  - **Trilha de Auditoria Forense:** Registro automático em `ForensicAuditService` com nível `OPERACIONAL` ou `CRITICA` em caso de cancelamento com justificativa, integrando-se à cadeia RFC 8785 🟢.
  - **Isolamento Multi-Tenant Estrito:** Clientes só visualizam e criam agendamentos para sua respectiva empresa; administradores e técnicos da empresa acessam visão ampla ou filtram por cliente 🟢.

### 2.11 Módulo `core` (Modelos Base, Storage Híbrido, Branding e Exception Handler)
- **Modelos:** `TimeStampedModel` (abstract base), `RegistroSincronizacaoDrive` (Feature 011), `ConfiguracaoBranding` (Feature 013) 🟢.
- **Parametrização Corporativa & Branding (Feature 013):**
  - Modelo Singleton `ConfiguracaoBranding` (tabela `shm_configuracao_branding`): Instância única protegida (`id=1`), garantindo integridade cadastral da prestadora de suporte 🟢.
  - Validação Cadastral & Mídias: Validação algorítmica de CNPJ (14 dígitos, cálculo de dois dígitos verificadores RF) e upload seguro com verificação por Pillow com teto estendido para 5.0 MB (`validar_imagem_branding`, Emenda E001) para logotipo e rubrica/assinatura 🟢.
  - Conversão em Streaming & Base64: Helpers de modelo geram representação Base64 para injeção sem falhas em relatórios vetoriais WeasyPrint e ReportLab Platypus 🟢.
  - Exclusão Física no Storage: Suporte a `remover_logotipo` e `remover_assinatura` em `ConfiguracaoBrandingAdminSerializer.update()`, garantindo expurgo físico dos arquivos em disco (Emenda E002) 🟢.
  - Endpoints REST: `GET /api/v1/branding/` (público) e `GET/PUT/PATCH/POST /api/v1/admin/branding/` (restrito a administradores `EMPRESA_ADMIN` / superusuários) 🟢.
- **Storage Híbrido VPS Local-First + Google Drive (Feature 011):**
  - Serviço `GoogleDriveStorageService`: Armazenamento primário de arquivos em disco local da VPS com espelhamento assíncrono para pastas hierarquizadas no Google Drive corporativo 🟢.
  - Concessão Automática de Acesso: Atribui permissão `role: reader` na pasta raiz do cliente para a conta Google cadastrada 🟢.
  - Integridade & Sincronização: Cálculo de hash SHA-256 em streaming, expurgo em cascata `post_delete` e comando administrativo `sincronizar_storage_drive` 🟢.
- **Recursos Globais:** Exception handler unificado que intercepta `ValidationError`, `PermissionDenied`, `NotFound` e exceções não tratadas retornando JSON no padrão RFC 7807 🟢.

### 2.12 Módulo `frontend` (React 19 SPA & Interface Pericial)
- **Arquitetura de Estado:** TanStack Query 5.66 com invalidação de cache estratégica após mutações, Vite 6.1 e Tailwind CSS 3.4 🟢.
- **Componentes Chave (22 Páginas SPA):**
  - `ExtratoContratoPage.tsx` & `EnviarExtratoModal.tsx` (Feature 012): Painel contábil oficial com 4 cards de métricas, barra de conciliação dedutiva, alerta visual ostensivo de "Previsão de Estouro de Franquia", tabela dedicada do Raio-X de demandas ativas (A2/Execução/A3), download do PDF compilado server-side e modal interativo de despacho por e-mail com seleção de destinatários confirmados 🟢.
  - `ConfiguracoesBrandingPage.tsx` (Feature 013): Painel de parametrização da identidade corporativa da prestadora com formulário em cards temáticos (Cabeçalho/Logotipo vs Rodapé/Chancela Pericial), máscaras reativas de CNPJ/Telefone, preview em tempo real de imagens de até 5 MB e botões dedicados de exclusão com 1 clique 🟢.
  - `Header.tsx`: Navbar corporativa com consumo dinâmico dos dados institucionais (logotipo, razão social e telefone) e link "Branding" no dropdown do perfil exclusivo para administradores (`isGerenteEmpresa`) 🟢.
  - `DocumentacaoStoragePage.tsx` (Feature 011): Página de documentação e auditoria do modelo híbrido de storage VPS Local-First + Google Drive 🟢.
  - `SchedulePage.tsx` & `ModalAgendamento.tsx` (Feature 007): Tela de gestão e calendário de reuniões de suporte com integração Google Meet 🟢.
  - `ProximaReuniaoWidget.tsx`: Widget em tempo real no Dashboard com contagem regressiva e link da próxima reunião 🟢.
  - `GravadorAudio.tsx` (Feature 004): Gravador de áudio via microfone no navegador com codificação MP3 `@breezystack/lamejs` 🟢.
  - `DocumentacaoAuditoriaPage.tsx` (Feature 006): Página oficial de auditoria forense com índice flutuante vertical amortecido (`DocumentacaoSidebarTOC.tsx`) e rota pública pericial `/publico/auditoria-forense` 🟢.
  - `LogHashChainingPage.tsx`: Estação pericial dedicada de "Consolidação Hash Chaining" com histórico dos selos diários e linha de badges normativos 🟢.
  - `ConfiguracoesNotificacoesPage.tsx`: Painel de "Governança de Notificações APP-In & Envio de E-mails" com switch "Não enviar para o autor" 🟢.
  - `ConfiguracoesSistemaPage.tsx`: Painel de parametrização da agenda corporativa Google Calendar com Guia Calendar 🟢.
  - Kanban Board de 6 colunas, Carrossel de Ciclos e tema claro/escuro dinâmico 🟢.

### 2.13 Módulo `auditoria_forense` (Cadeia de Custódia e Verificador Autônomo Offline)
- **Enquadramento Normativo:** Código de Processo Penal (CPP arts. 158-A a 158-F — Cadeia de Custódia de Vestígios Digitais), Código de Processo Civil (CPC arts. 411 e 422 — Força Probatória de Documentos Digitais) e ISO/IEC 27037:2012 (Diretrizes para Identificação, Coleta, Aquisição e Preservação de Evidências Digitais) 🟢.
- **Princípio da Inversão da Caixa-Preta:** Elimina o sigilo corporativo em litígios; o perito não precisa confiar no software nem em relatórios estáticos em PDF — ele extrai o payload JSON bruto e executa a verificação matemática em sua própria estação forense isolada 🟢.
- **Algoritmo Determinístico do Verificador Independente (`verificador_independente.py`):**
  - Implementado em Python 3 puro sem dependência de bibliotecas externas (zero pip).
  - Executa canonicalização RFC 8785 serializando tipos de forma determinística: float sem zeros supérfluos, booleanos minúsculos, ordenação léxica de chaves UTF-8 e escape seguro de caracteres de controle.
  - Valida a integridade encadeada: `H_0 = '0'*64`, `H_i = SHA256(particao + i + timestamp + evento + H_{i-1} + SHA256(JCS(payload)))`.
  - Diagnóstico preciso: Em caso de adulteração retroativa de saldo ou data, identifica o ponto exato da quebra (`TAMPER DETECTED at sequence #N`).


