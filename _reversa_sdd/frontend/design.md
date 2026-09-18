# Design do Módulo Frontend

## 1. Páginas Principais (22 Páginas SPA)
1. `LoginPage.tsx`: Autenticação tradicional e atalho para Magic Login e Google OAuth.
2. `DashboardPage.tsx`: Cockpit operacional do cliente com resumo de horas e `<ProximaReuniaoWidget />`.
3. `AdminDashboardPage.tsx`: Cockpit executivo da prestadora com métricas de equipe, faturamento e kanban.
4. `ClientesPage.tsx`: Cadastro de clientes PF/PJ com máscaras e disparos de Magic Link.
5. `AceiteClientePage.tsx`: Tela pública de auto-aprovação cadastral pelo tomador.
6. `ContratosPage.tsx`: Gestão de vigências, franquias, aditivos e carência contratual.
7. `AceiteContratoPage.tsx`: Tela pública de homologação formal do contrato pelo cliente.
8. `ExtratoContratoPage.tsx`: Extrato contábil oficial com 4 cards de métricas, barra de conciliação dedutiva, alerta visual ostensivo de "Previsão de Estouro de Franquia", tabela do Raio-X de demandas ativas (A2/Execução/A3), download em 1 clique de PDF vetorial oficial e modal `EnviarExtratoModal.tsx` (Feature 012).
9. `NovoPedidoPage.tsx`: Abertura de chamados com protocolo OS, upload de anexos e gravador de áudio MP3.
10. `DetalhePedidoPage.tsx`: Visão completa do chamado, histórico de interações e links para pasta Google Drive.
11. `AnalisePedidoPage.tsx`: Triagem técnica, elaboração de orçamentos e agendamento contextual de reuniões.
12. `ExecucaoCicloPage.tsx`: Apontamento técnico de horas, anexos e solicitação de aceite formal com trava de tolerância (+30%).
13. `MagicLinkPage.tsx`: Tela de redirecionamento transparente de links de autenticação e aprovação.
14. `ConfirmarNotificacaoPage.tsx`: Tela pública de opt-in para destinatários adicionais de contratos.
15. `ConfiguracoesNotificacoesPage.tsx`: Painel de "Governança de Notificações APP-In & Envio de E-mails" com switch "Não enviar para o autor".
16. `ConfiguracoesSistemaPage.tsx`: Parametrização da agenda Google Calendar, testes de API e modal Guia Calendar.
17. `LogHashChainingPage.tsx`: Estação pericial dedicada à "Consolidação Hash Chaining" com histórico dos selos diários e badges normativos ISO/CPP/RFC 8785.
18. `DocumentacaoAuditoriaPage.tsx`: Laudo pericial e compêndio de imutabilidade forense com índice flutuante vertical amortecido (`DocumentacaoSidebarTOC.tsx`) e download de verificador offline em Python puro.
19. `SchedulePage.tsx`: Central de agendamento de reuniões técnicas com integração ao Google Meet e tripla régua de lembretes (24h, 30m, 15m).
20. `PerfilPage.tsx`: Gestão cadastral do usuário conectado, alteração de senha e preferências.
21. `DocumentacaoStoragePage.tsx`: Documentação técnica do modelo de armazenamento híbrido VPS Local-First + Google Drive.
22. `ConfiguracoesBrandingPage.tsx`: Painel administrativo de parametrização da identidade corporativa (Logotipo, dados fiscais, rubrica do representante legal, upload até 5 MB e preview imediato - Feature 013).

## 2. Componentes e Modais Reutilizáveis
- `Header.tsx`: Navbar corporativa com consumo dinâmico do Branding e link restrito para administradores.
- `EnviarExtratoModal.tsx`: Seleção interativa de destinatários confirmados para despacho do extrato oficial por e-mail.
- `MigracaoSaldoModal.tsx`: Assistente de transferência e compensação contábil de saldo entre contratos com trava pessimista.
- `ModalAgendamento.tsx`: Criação e edição de reuniões de suporte com geração automática de sala Google Meet.
- `GravadorAudio.tsx`: Gravação de áudio via microfone com codificação client-side MP3 `@breezystack/lamejs`.
