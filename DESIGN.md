---
name: SHM — Support Hours Manager
description: Engenharia de Software de Alta Integridade para Gestão de Contratos, Horas Técnicas e Auditoria Forense
colors:
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-light: "#eef2ff"
  forensic-emerald: "#059669"
  forensic-emerald-hover: "#047857"
  forensic-emerald-light: "#ecfdf5"
  warning-amber: "#d97706"
  warning-amber-light: "#fffbeb"
  danger-rose: "#e11d48"
  danger-rose-light: "#fff1f2"
  vault-slate-bg: "#f8fafc"
  vault-slate-surface: "#ffffff"
  vault-slate-border: "#e2e8f0"
  vault-slate-text: "#0f172a"
  vault-slate-muted: "#64748b"
  obsidian-bg: "#0b0f19"
  obsidian-surface: "#0f172a"
  obsidian-border: "#1e293b"
  obsidian-text: "#f8fafc"
  obsidian-muted: "#94a3b8"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.025em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.vault-slate-surface}"
    textColor: "{colors.vault-slate-text}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  input-text:
    backgroundColor: "{colors.vault-slate-bg}"
    textColor: "{colors.vault-slate-text}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  badge-forensic:
    backgroundColor: "{colors.forensic-emerald-light}"
    textColor: "{colors.forensic-emerald}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
---

# Design System: SHM — Support Hours Manager

## Overview

**Creative North Star: "The Forensic Vault" (O Cofre Pericial)**

O sistema visual do SHM materializa o compromisso central do produto: rigor cirúrgico, transparência contábil inegociável e integridade probatória em contratos corporativos de TI. Em um ecossistema onde cada minuto orçado e consumido pode se tornar objeto de auditoria legal, o design recusa ornamentos supérfluos, cartesianamente separando dados de estado através de superfícies límpidas, contrastes calculados e tipografia técnica de máxima legibilidade.

A atmosfera combina a autoridade institucional do Índigo Corporativo (`#4f46e5`) com a precisão pericial do Esmeralda Forense (`#059669`). Em modo claro, a interface projeta a clareza de um livro-razão moderno sobre fundo ardósia suave (`#f8fafc`). Em modo escuro, mergulha em uma densidade abissal (`#0b0f19`), emulando um terminal de custódia onde blocos de DNA criptográfico e selos noturnos ganham relevância luminosa controlada.

**Key Characteristics:**
- **Rigor Matemático e Pericial:** Hashes SHA-256, cálculos de saldo e carimbos ISO-8601 tratados com honra tipográfica em JetBrains Mono.
- **Tonal Layering com Bordas Estruturais:** Profundidade construída por hierarquia de fundos e linhas nítidas de 1px (`border-slate-200 / slate-800`), sem poluição de sombras decorativas.
- **Componentes Táteis e Confiantes:** Raios generosos de curvatura (`12px` a `24px`) que transmitem polimento executivo, botões com transições responsivas e anéis de foco marcantes.
- **Paridade Absoluta Light / Dark:** Nenhuma tela, badge ou gráfico perde contraste ou legibilidade na alternância de tema.

## Colors

A paleta equilibra a sobriedade institucional da consultoria técnica com sinalizadores semânticos rigorosamente atrelados à governança do contrato.

### Primary
- **Institutional Indigo** (`#4f46e5` / Dark: `#6366f1`): Cor mestre de ação institucional. Utilizada no botão de ação principal, abas ativas, links de destaque e cabeçalhos de contratos.
- **Deep Indigo Hover** (`#4338ca`): Estado de foco e interação do botão primário.
- **Indigo Glow Surface** (`#eef2ff` / Dark: `#312e81` com opacidade): Fundo de chips selecionados e realces contextuais.

### Secondary
- **Forensic Emerald** (`#059669` / Dark: `#10b981`): Sinalizador de integridade, validação probatória e aceites formais. Reservado com estrita parcimônia para quando a verificação criptográfica estiver 100% íntegra.
- **Emerald Verification Surface** (`#ecfdf5` / Dark: `rgba(6, 78, 59, 0.4)`): Fundo do banner de validação da Trilha DNA e badges de aceites confirmados.

### Tertiary
- **Warning Amber** (`#d97706` / Dark: `#f59e0b`): Indica tolerância de horas excedidas (+30%), ciclos aguardando aprovação e alertas de carência.
- **Danger Rose** (`#e11d48` / Dark: `#f43f5e`): Cancelamento de contratos, exclusão irreversível de documentos e quebra de integridade na cadeia SHA-256.

### Neutral
- **Vault Slate (Light Base)** (`#f8fafc`): Fundo geral da aplicação e de inputs no modo claro.
- **Clean Vault White** (`#ffffff`): Superfície de cards, tabelas, modais e painéis operacionais.
- **Obsidian Void (Dark Base)** (`#0b0f19`): Fundo profundo e imersivo no modo escuro.
- **Obsidian Slate Surface** (`#0f172a`): Superfície de cards e painéis no modo escuro.
- **Precision Border** (`#e2e8f0` no light / `#1e293b` no dark): Fronteira visual obrigatória para todos os contêineres e blocos de dados.
- **Primary Text** (`#0f172a` no light / `#f8fafc` no dark): Títulos, valores contábeis e texto com contraste WCAG AAA.
- **Muted Text** (`#64748b` no light / `#94a3b8` no dark): Legendas, metadados periciais e rótulos auxiliares.

### Named Rules
**The Forensic Rarity Rule.** A cor Esmeralda (`#059669`) é estritamente proibida em elementos puramente decorativos. Ela só tem licença para figurar na interface quando um cálculo de saldo estiver validado, um aceite for consumado ou a integridade da fita SHA-256 estiver matematicamente comprovada.

**The Dual-Mode Parity Rule.** Qualquer componente ou tela criada deve possuir contraste auditado e fidelidade estrita em ambos os modos (Light e Dark). O modo escuro não é um filtro posterior invertido; é uma superfície de custódia com sua própria harmonia de slate e obsidian.

## Typography

A tipografia do SHM estabelece uma ponte entre a comunicação executiva humana e o registro de auditoria computacional.

**Display Font:** `Plus Jakarta Sans`, com fallback para `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.  
**Body Font:** `Plus Jakarta Sans`, com mesma cadeia de fallbacks.  
**Label / Mono Font:** `JetBrains Mono`, com fallback para `monospace`.

**Character:** A `Plus Jakarta Sans` fornece geometria limpa, amigável e contemporânea para títulos e interações humanas, enquanto a `JetBrains Mono` atua como a voz indelével da máquina, conferindo peso jurídico a hashes, números de pedidos, saldos contratuais e timestamps.

### Hierarchy
- **Display** (ExtraBold 800, `2.25rem` / `36px`, line-height `1.2`, tracking `-0.025em`): Indicadores de topo de dashboard, grandes números de saldo em horas e títulos principais de extrato.
- **Headline** (Bold 700, `1.5rem` / `24px`, line-height `1.3`, tracking `-0.02em`): Cabeçalhos de páginas, títulos de modais operacionais e seções de documentação.
- **Title** (Bold 700, `1.125rem` / `18px`, line-height `1.4`, tracking `-0.01em`): Cabeçalhos de cards de contrato, nomes de clientes e títulos de abas.
- **Body** (Medium 500, `0.875rem` / `14px`, line-height `1.5`): Textos descritivos de ciclos, termos de contrato, corpo de formulários e mensagens de alinhamento técnico.
- **Label / Mono** (SemiBold 600, `0.75rem` / `12px` ou `11px`, letter-spacing `0.025em`): Hashes SHA-256, partições (`contrato:12`), IPs de origem, carimbos ISO-8601 e status numéricos.

### Named Rules
**The Monospace Proof Rule.** Qualquer dado que pertença à cadeia de custódia pericial (hashes, UUIDs de magic links, valores monetários/horas e carimbos de tempo) deve ser obrigatoriamente tipografado em `JetBrains Mono`.

## Layout

O SHM adota um modelo espacial responsivo com barra superior fixa institucional (`Header`), barra lateral retrátil com listagem viva de contratos (`SidebarContratos`) e área central de trabalho com rolagem contínua suave (`AppLayout`).

- **Grid e Espaçamento Base:** Sistema modular baseado em escala de `4px` (`8px`, `12px`, `16px`, `24px`, `32px`).
- **Margens de Contêiner:** `p-4 sm:p-6 lg:p-8` na área de trabalho principal.
- **Breakpoints Canônicos:**
  - `sm`: `640px` (smartphones grandes / modo aprovação executiva móvel)
  - `md`: `768px` (tablets e colapso da sidebar de contratos)
  - `lg`: `1024px` (laptops padrão)
  - `xl`: `1280px` e `2xl`: `1536px` (telas widescreen para visualização densa de tabelas e timelines)
- **Painéis Flutuantes de Apoio:** Presença de botão flutuante persistente de retorno ao topo (`ScrollToTopButton`) para navegação ergonômica em documentos extensos e timelines periciais.

## Elevation & Depth

A filosofia de profundidade do SHM é **Tonal Layering + Precision Borders**. O sistema é deliberadamente plano em seu estado de repouso, utilizando bordas milimétricas nítidas (`1px solid`) para separar camadas de informação, reservando sombras profundas para interrupções focais (modais) e realces sutis de ação.

### Shadow Vocabulary
- **Modal Depth** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`): Utilizado no contêiner principal de diálogos modais (`rounded-3xl shadow-2xl`).
- **Primary Action Glow** (`box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.25)`): Sombra sutil colorida que confere elevação confiante ao botão de ação primária institucional.
- **Glass Panel Surface** (`backdrop-filter: blur(16px)` com borda semitransparente `rgba(203, 213, 225, 0.9)` no light / `rgba(51, 65, 85, 0.6)` no dark): Efeito vítreo fosco aplicado ao topo fixo e caixas de verificação rápida.

### Named Rules
**The Structural Border Rule.** Todo card, tabela, barra de busca ou contêiner operacional deve possuir uma borda explícita de `1px` (`border-slate-200` no light / `border-slate-800` no dark). Superfícies nunca devem se fundir por mera coincidência de fundo.

## Shapes

A linguagem de formas do SHM combina cantos arredondados generosos para interfaces humanas com geometria rígida para registros de dados.

- **Badges e Tags:** Cantos ligeiramente arredondados (`rounded-md` / `6px`), emoldurando os códigos sem desviar a atenção.
- **Botões e Campos de Input:** Cantos confortavelmente arredondados (`rounded-xl` / `12px`), proporcionando área de toque generosa e toque moderno.
- **Cards e Contêineres de Grupo:** Curvatura ampla (`rounded-2xl` / `16px`), definindo blocos operacionais autônomos.
- **Modais de Alta Importância:** Curvatura marcante (`rounded-3xl` / `24px`), criando distinção imediata do fundo.
- **Avatares e Contadores Circulares:** Totalmente esféricos (`rounded-full` / `9999px`).

## Components

Os componentes são construídos com foco em **densidade de informação, estados táteis e feedback imediato**.

### Buttons
- **Shape:** Arredondamento padrão de 12px (`rounded-xl`).
- **Primary:** Fundo Índigo (`bg-indigo-600 hover:bg-indigo-700`), texto branco em peso 700 (`font-bold text-xs`), padding `px-4.5 py-2.5`, micro-sombra `shadow-sm shadow-indigo-500/20`.
- **Secondary / Ghost:** Fundo de superfície (`bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800`), texto ardósia (`text-slate-700 dark:text-slate-300`), borda estrutural `border border-slate-200 dark:border-slate-700`.
- **Danger:** Fundo Carmim (`bg-rose-600 hover:bg-rose-700`), texto branco, sombra `shadow-rose-600/20`.

### Cards / Containers
- **Corner Style:** `rounded-2xl` para cards normais; `rounded-3xl` para modais e painéis de fechamento de contrato.
- **Background:** Branco puro (`#ffffff`) no Light Mode; ardósia profunda (`#0f172a`) no Dark Mode.
- **Border:** `1px solid` com `border-slate-200/80` no Light e `border-slate-700/70` no Dark.
- **Internal Padding:** `p-5 sm:p-6` como padrão.

### Inputs / Fields
- **Style:** Fundo neutro suave (`bg-slate-50 dark:bg-slate-800`), borda sólida `border-slate-300 dark:border-slate-700`, texto em peso 700 (`font-bold text-xs`), padding `p-3`.
- **Focus:** Contorno ativo com anel de realce de 2px (`focus:ring-2 focus:ring-indigo-500`).
- **Error:** Borda destacada em carmim (`border-rose-500`) acompanhada de mensagem explicativa em texto 11px.

### Badges & Category Chips
- **Style:** Formato de pílula retangular com cantos suaves (`rounded-xl` para botões de filtro / `rounded-md` para contadores).
- **Categorias Periciais:** Identificadas por cores funcionais (Governança: Índigo; Documentos: Sky; Notificações: Violeta; Relatórios: Roxo; Integridade: Esmeralda).

### Signature Component: TimelineAuditoriaContrato (Fita DNA Forense)
- **Descrição:** Painel pericial que exibe a cadeia transacional encadeada do contrato. Cada elo apresenta número sequencial, carimbo UTC, evento canônico, identificador de usuário, IP e o hash criptográfico SHA-256 do elo anterior (`previous_hash`) e do elo atual.
- **Banner de Integridade:** Barra superior com status (`Íntegro` ou `Quebra Detectada`), total de registros verificados, tempo de dispersão em milissegundos e botão de cópia de hash com feedback visual.

## Do's and Don'ts

### Do:
- **Do** utilizar tipografia `JetBrains Mono` em qualquer exibição de hashes SHA-256, números de contratos, saldos de franquia e datas ISO-8601.
- **Do** manter bordas explícitas de 1px (`border-slate-200` / `border-slate-800`) em todos os cards, modais e tabelas operacionais.
- **Do** verificar paridade e contraste tanto no tema claro quanto no tema escuro em todo novo componente.
- **Do** reservar o tom Esmeralda (`#059669`) exclusivamente para atestados de integridade, aceites concedidos e validações com êxito.
- **Do** utilizar raios de curvatura de 12px (`rounded-xl`) para botões e inputs, e 24px (`rounded-3xl`) para diálogos modais.

### Don't:
- **Don't** aplicar sombras escuras ou difusas pesadas fora dos diálogos modais; o sistema baseia-se em camadas tonais e bordas estruturais.
- **Don't** truncar hashes criptográficos SHA-256 sem oferecer botão imediato de cópia do valor integral para a área de transferência.
- **Don't** criar elementos puramente decorativos em gradientes chamativos que desviem a atenção dos dados de governança do contrato.
- **Don't** utilizar classes utilitárias de cores arbitrárias fora da escala Slate / Indigo / Emerald / Amber / Rose definida.
