# ADR 014: Desacoplamento do Painel de Auditoria Hash Chaining e Especialização da Governança de Notificações

## Status
Aceito e Implementado 🟢

## Contexto
Durante a evolução da plataforma e adição do módulo de auditoria forense com Hash Chaining (RFC 8785 / SHA-256 / Selo Diário RN-16) e do módulo Schedule (Google Calendar), a interface consolidava inspeções forenses dentro da tela genérica de configurações do sistema (`ConfiguracoesSistemaPage`). Isso gerava sobrecarga cognitiva e receio operacional:
1. Usuários e auditores confundiam o botão de "Atualizar" da tela de auditoria com um gatilho de recálculo ou alteração de rotinas agendadas (quando se tratava apenas de um `GET` no snapshot de integridade).
2. A página de configurações misturava credenciais de API do Google com relatórios periciais de cadeia de custódia (ISO/IEC 27037).
3. A governança de notificações demandava clara separação entre alertas in-app operacionais e disparos de e-mails transacionais/SMTP.

## Decisão
1. **Desacoplamento e Rota Própria para Auditoria Forense (`/auditoria/hash-chaining`):**
   - Criação da página `LogHashChainingPage.tsx`, dedicada exclusivamente à visualização da cadeia de blocos diários (`SeloDiarioAuditoria`) e registros de auditoria pericial (`RegistroAuditoria`).
   - Apresentação de selos normativos em linha única horizontal com badge "Daily Seal" (RN-16) e certificações de conformidade pericial: `ABNT NBR ISO/IEC 27037`, `CPP Art. 158`, `SHA-256`, `RFC 8785 (JCS)`, `Append-Only`, `Hash Chaining`.
2. **Ação Somente-Leitura Explícita ("Recarregar Dados"):**
   - Substituição do termo ambíguo "Atualizar" por "Recarregar Dados", acompanhado de carimbo de data/hora (`Última sincronização: HH:MM:SS`) e texto orientador que atesta a natureza 100% idempotente e de somente-leitura da requisição.
3. **Especialização de `ConfiguracoesSistemaPage`:**
   - A página de configurações do sistema passa a focar estritamente na parametrização do Google Calendar (Service Account, credenciais JSON, Calendar ID) e no "Guia Calendar" (passo a passo de configuração).
4. **Governança de Notificações:**
   - Padronização do título da página de configurações de notificações para "Governança de Notificações APP-In & Envio de E-mails", assegurando clareza sobre o escopo multicanal das regras de entrega e supressão.

## Consequências
- **Positivas:**
  - Auditores e administradores contam com uma estação pericial isolada e intuitiva.
  - Eliminação de insegurança operacional quanto ao impacto das consultas no histórico imutável.
  - Clareza na separação de responsabilidades (SoC) entre integrações externas e auditoria forense.
- **Trade-offs:**
  - Adição de uma nova entrada no menu de navegação e no roteador do frontend.
