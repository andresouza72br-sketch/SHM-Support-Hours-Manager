# Requisitos do Módulo Frontend

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Single Page Application (SPA) em React 19, TypeScript e Tailwind CSS, orientada a componentes modulares, consumo assíncrono via TanStack Query e suporte a fluxos autenticados e telas públicas de Magic Link.

## 2. Requisitos Funcionais
- **RF-FRT-01 (Must):** Autenticação JWT com auto-refresh transparente via interceptors Axios 🟢.
- **RF-FRT-02 (Must):** Telas públicas de Magic Link para aprovação cadastral, aprovação de orçamento, aceite de ciclo e confirmação de opt-in de notificação 🟢.
- **RF-FRT-03 (Must):** Modal de Migração e Compensação de Saldo (`MigracaoSaldoModal`) com pré-visualização contábil em tempo real e validação de saldos 🟢.
- **RF-FRT-04 (Must):** Modal de Documentos Contratuais (`DocumentosContratoModal`) com exibição do hash SHA-256 e status de integridade 🟢.
- **RF-FRT-05 (Must):** Painel de Gestão de Notificações (`ConfiguracoesNotificacoesPage`) com switches para ativação de canais e papéis 🟢.
- **RF-FRT-06 (Must):** Cockpit Executivo (`AdminDashboardPage`) e Extrato Financeiro de Horas (`ExtratoContratoPage`) 🟢.
- **RF-FRT-07 (Must):** Kanban Board com sincronização de status de chamados em tempo real 🟢.
- **RF-FRT-08 (Must):** Página de Documentação da Auditoria Forense e Imutabilidade (`DocumentacaoAuditoriaPage`), acessível tanto pelo painel administrativo quanto em rota pública aberta (`/publico/auditoria-forense`) para peritos judiciais e autoridades 🟢.
- **RF-FRT-09 (Must):** Sumário lateral da documentação (`DocumentacaoSidebarTOC`) posicionado de forma **flutuante fixa e centralizada verticalmente** na viewport (`max(5rem, calc(50vh - halfHeight))`), com rolagem suave calculada sem sobreposição de cabeçalho e trava anti-jitter no Scrollspy 🟢.
- **RF-FRT-10 (Must):** Disponibilização e download direto em 1 clique do código-fonte do utilitário pericial autônomo offline em Python puro (`verificador_independente.py`) com zero dependências externas (`pip`) 🟢.
- **RF-FRT-11 (Must):** Extrato Oficial de Contrato (`ExtratoContratoPage.tsx`) com 4 cards de métricas, barra de conciliação dedutiva, alerta visual ostensivo de "Previsão de Estouro de Franquia", tabela dedicada do Raio-X de demandas ativas (A2/Execução/A3), download em 1 clique do PDF oficial compilado server-side e modal interativo `EnviarExtratoModal.tsx` com seleção de destinatários confirmados 🟢.
- **RF-FRT-12 (Must):** Página de Parametrização de Branding Corporativo (`ConfiguracoesBrandingPage.tsx`) com formulário em cards temáticos (Cabeçalho/Logotipo vs Rodapé/Chancela Pericial), máscaras dinâmicas de CNPJ/Telefone, preview imediato de arquivos de até 5 MB e botões de exclusão de mídia 🟢.
- **RF-FRT-13 (Must):** Página de Documentação Técnica de Storage (`DocumentacaoStoragePage.tsx`) com diagrama interativo do modelo híbrido de armazenamento VPS Local-First + Google Drive 🟢.

