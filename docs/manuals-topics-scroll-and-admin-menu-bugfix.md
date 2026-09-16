# BUG-FIX: Correção de Tópicos/Scroll nos Manuais e Ajuste do Menu Admin

## Goal
Corrigir o funcionamento de navegação por tópicos e rolagem suave (scroll / scrollspy) nas páginas de documentação/manuais (`DocumentacaoStoragePage` e `DocumentacaoAuditoriaPage`) e eliminar a duplicação dos itens de Storage no menu suspenso de usuário administrador (`Header.tsx`).

---

## 1. Causa Raiz Identificada

### A. Tópicos e Scroll nos Manuais
1. **Conflito de Scroll no TOC do Storage (`DocumentacaoStorageTOC.tsx`)**:
   - O `useEffect` executava `activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })` dentro do container da barra lateral a cada mudança de `topicoAtivo`.
   - No navegador, `Element.scrollIntoView()` sobe a árvore de nós até o `window`, **cancelando imediatamente** qualquer rolagem suave (`window.scrollTo`) iniciada pelo clique no tópico e causando travamento/pulos ao rolar a página manualmente.
2. **Timeout Curto no Deslocamento Suave (`800ms`)**:
   - Rolar páginas extensas (como o laudo pericial ou o manual de storage) leva entre 900ms e 1400ms. Aos 800ms, a trava `isManualScrollRef` era liberada no meio do trajeto, fazendo o `handleScroll` reescrever `topicoAtivo` para uma seção intermediária.
3. **Dessincronização de Rota e Aba no Storage (`DocumentacaoStoragePage.tsx`)**:
   - O estado `abaAtiva` era inicializado apenas no mount via `useState`. Ao navegar entre `/documentacao/storage` e `/admin/documentacao/storage`, o componente não remontava e a aba não atualizava, gerando incompatibilidade de IDs no DOM (`getElementById` retornava `null`).
4. **Cálculo de Topo no Scrollspy**:
   - No topo da página (área do hero/banner), nenhum tópico casava com o filtro do scrollspy, impedindo a seleção inicial correta do primeiro item ao rolar de volta para cima.

### B. Dois Itens no Menu do Usuário Admin (`Header.tsx`)
- O menu exibe:
  1. `Manual do Cloud Storage` (`/documentacao/storage`) — item comum a todos os usuários.
  2. `Administração do Storage (5 TB)` (`/admin/documentacao/storage`) — item extra sob a trava `isGerenteEmpresa`.
- Ambos apontam para a mesma página (`DocumentacaoStoragePage`), que já possui o seletor de abas ("Manual Prático" vs "Manual Técnico (5 TB)"). Para o administrador, a existência de dois itens separados gerava redundância e estranheza visual.

---

## Tasks

- [x] **Task 1: Corrigir scroll interno da sidebar em `DocumentacaoStorageTOC.tsx`**
  - Substituir `activeEl.scrollIntoView()` por rolagem restrita ao container (`navContainerRef.current.scrollTop`), sem acionar o `window`.
  - → *Verify*: Clicar nos tópicos do menu lateral não cancela a descida da página e rolar manualmente não trava a tela.

- [x] **Task 2: Sincronizar abas com rotas e otimizar rolagem em `DocumentacaoStoragePage.tsx`**
  - Adicionar `useEffect` ouvindo `location.pathname` e `defaultAba` para atualizar `abaAtiva` e `topicoAtivo` automaticamente.
  - Ajustar tempo de trava manual para 1200ms e fallback do primeiro tópico no topo (`window.pageYOffset < 200`).
  - Sincronizar rota ativa via `useNavigate` ao alternar abas pelo botão.
  - → *Verify*: Alternar entre `/documentacao/storage` e `/admin/documentacao/storage` troca a aba e os tópicos correspondentes no ato.

- [x] **Task 3: Refinar scroll e scrollspy em `DocumentacaoAuditoriaPage.tsx`**
  - Ajustar sincronização suave e fallback do tópico ativo (`fundamentos-shm`) ao rolar até o cabeçalho.
  - Sincronizar dropdown móvel com a posição real de rolagem.
  - → *Verify*: Clicar no tópico 07 (Legislação) rola diretamente até o final sem regredir o item ativo no meio do caminho.

- [x] **Task 4: Unificar e organizar os itens de Storage no Menu do Usuário em `Header.tsx`**
  - Condicionar o link de Storage no menu de usuário:
    - Se usuário comum/cliente: `Manual do Cloud Storage` (`/documentacao/storage`).
    - Se admin/gerente: `Manual & Gestão do Storage (5 TB)` (`/admin/documentacao/storage`), removendo o segundo item duplicado da lista de configurações.
  - Adicionar divisória semântica clara entre itens de perfil/documentação e itens de gestão avançada da empresa.
  - → *Verify*: Abrir o menu como Administrador e verificar que existe apenas 1 item coeso e direto para a central de Storage.

- [x] **Task 5: Validação e Testes E2E**
  - Executar `npm run build` no frontend para garantir ausência de quebras de tipagem e de bundle.
  - Verificar responsividade mobile e desktop.
  - → *Verify*: Build verde com 0 erros e navegação fluida em ambas as documentações.

---

## Done When
- [x] Clicar em qualquer tópico no menu lateral ou dropdown móvel rola com precisão até a respectiva seção com margem ideal do cabeçalho.
- [x] Rolar a página com mouse/touch atualiza o tópico ativo no TOC sem travamentos, pulos ou cancelamento de rolagem.
- [x] O menu de usuário do Administrador não possui links duplicados para o Storage, mantendo navegação clara e limpa.
- [x] `npm run build` finaliza com código de saída 0.
