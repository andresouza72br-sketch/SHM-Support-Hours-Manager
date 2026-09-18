# Adendo de Convergência SDD — Feature 013: Configuração de Personalização (Branding) da Empresa de Suporte e Assinatura Digitalizada nos Relatórios Oficiais

> **Identificador:** `013-branding-empresa-suporte`  
> **Data:** `2026-09-17`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-17.
Superado pela re-extração de 2026-09-18.

## Resumo da entrega

Implementada a gestão unificada de identidade corporativa e parametrização institucional da empresa prestadora de suporte (Branding). O sistema agora conta com um modelo Singleton `ConfiguracaoBranding` no app `core` (`shm_configuracao_branding`), garantindo instância única com salvaguardas de integridade, validação estrita de CNPJ com algoritmo oficial da Receita Federal e armazenamento seguro de logotipo e rubrica/assinatura digitalizada com limite de 2MB e conversão automática para Base64.

No backend, foram disponibilizados endpoints REST públicos (`GET /api/v1/branding/`) para apresentação institucional e restritos (`GET/PUT/PATCH/POST /api/v1/admin/branding/`) com proteção RBAC exclusiva para administradores da prestadora (`EMPRESA_ADMIN` / `is_superuser`). Os serviços de emissão de Extrato Oficial em PDF (`pdf_service.py`, `extrato_oficial.html`) foram atualizados para substituir marcas e textos fixos em código por dados dinâmicos, incluindo logotipo em alta resolução e o bloco pericial de encerramento com chancela formal e rubrica do representante legal. A comunicação por e-mail (`email_service.py`) passa a carregar rodapés institucionais com telefone de suporte, link do portal, e-mail e slogan.

No frontend, foi adicionada a página administrativa `ConfiguracoesBrandingPage.tsx` com formulário em cards temáticos, máscaras de CNPJ/Telefone, preview imediato de arquivos de imagem e toasts de confirmação. O componente `Header.tsx` foi enriquecido com a opção "Branding" no menu do usuário para perfil `isGerenteEmpresa`, além de exibir o logotipo, nome da empresa e telefone de suporte de forma dinâmica.

Total de 14 ações atômicas concluídas com sucesso (T001 a T014), cobertura com 100% de testes passando no backend (`test_branding.py` e `test_extrato_pdf.py` - 15 testes aprovados) e compilação de produção do frontend (`npm run build`) validada sem erros de lint ou tipagem.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.core.models` | `componente-novo` | Adição do modelo Singleton `ConfiguracaoBranding` com métodos `clean()`, `save()`, `delete()`, `get_instancia()` e helpers Base64 de imagem. |
| `_reversa_sdd/architecture.md` | `backend/apps.core.validators` | `componente-novo` | Validadores fiscais e de mídias: `validar_cnpj` (dígitos verificadores da RF) e `validar_imagem_branding` (Pillow, extensões permitidas e limite 2MB). |
| `_reversa_sdd/architecture.md` | `backend/apps.core.serializers` | `componente-novo` | Serializers `BrandingPublicoSerializer` (dados visíveis a clientes/técnicos) e `ConfiguracaoBrandingAdminSerializer` (dados cadastrais e fiscais completos). |
| `_reversa_sdd/architecture.md` | `backend/apps.core.views` | `componente-novo` | Views REST `BrandingPublicoView` e `BrandingAdminView` registradas em `/api/v1/branding/` e `/api/v1/admin/branding/`. |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.pdf_service` | `regra-alterada` | Injeção dinâmica de logotipo corporativo, dados cadastrais e bloco de chancela formal do representante legal (nome, cargo, doc e rubrica) nos extratos ReportLab e WeasyPrint. |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.email_service` | `regra-alterada` | Injeção de rodapé institucional nos e-mails transacionais contendo telefone de suporte, link do sistema e slogan. |
| `_reversa_sdd/architecture.md` | `frontend/src/pages` | `componente-novo` | Página administrativa `ConfiguracoesBrandingPage.tsx` com formulário por abas/cartões, upload de imagem, pré-visualização e persistência via API. |
| `_reversa_sdd/architecture.md` | `frontend/src/components/layout` | `componente-alterado` | Inclusão de link "Branding" no dropdown do perfil (`Header.tsx`) para administradores da prestadora (`isGerenteEmpresa`) e exibição de contatos. |
| `_reversa_sdd/domain.md` | `core` | `regra-nova` | **RN-BRANDING-01:** Exclusividade de acesso e manutenção de dados fiscais/institucionais reservada a perfis `EMPRESA_ADMIN` e superusuários. |
| `_reversa_sdd/domain.md` | `core` | `regra-nova` | **RN-BRANDING-02:** Padrão Singleton garantido em nível de modelo e banco (`id=1`), com fallbacks estáticos para inicialização resiliente. |
| `_reversa_sdd/domain.md` | `core` | `regra-nova` | **RN-BRANDING-03:** Validação cadastral compulsória de CNPJ (14 dígitos) e restrição de upload de mídias a 2MB com verificação por Pillow. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-BRANDING-04:** Chancela pericial e assinatura/rubrica do representante legal inseridas no encerramento de relatórios oficiais (Extrato de Contrato). |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-BRANDING-05:** Princípio da não-retroatividade: PDFs arquivados com hash SHA-256 no passado mantêm-se inalterados (ISO/IEC 27037). |

## Regras sob vigilância

- `W001`: Compilação resiliente de relatórios PDF com fallback institucional em caso de imagens corrompidas ou ausentes. Ver `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`.
- `W002`: Integridade forense de arquivos arquivados com hash SHA-256 imutável. Ver `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`.
- `W003`: Resiliência em templates de e-mails transacionais com defaults para dados não preenchidos. Ver `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`.
- `W004`: Proteção RBAC contra alterações não autorizadas nos dados institucionais da prestadora (403 Forbidden). Ver `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`.
- `W005`: Preservação da experiência de navegação e responsividade no header corporativo da SPA. Ver `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`.

## Fontes

- `_reversa_forward/013-branding-empresa-suporte/requirements.md`
- `_reversa_forward/013-branding-empresa-suporte/roadmap.md`
- `_reversa_forward/013-branding-empresa-suporte/data-delta.md`
- `_reversa_forward/013-branding-empresa-suporte/legacy-impact.md`
- `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`
- `_reversa_forward/013-branding-empresa-suporte/actions.md`
- `_reversa_forward/013-branding-empresa-suporte/progress.jsonl`

## Atualização 2026-09-17

### Resumo das Emendas (E001 e E002)

Foram incorporadas duas emendas de refinamento técnico e operacional sobre a entrega da Feature 013:

1. **Emenda E001 (Limite de Mídia 5 MB):** Ampliação da trava de tamanho de arquivo em `validar_imagem_branding` de 2 MB para 5 MB, permitindo o upload de logotipos corporativos e rubricas digitalizadas de alta definição, com validações sincronizadas no frontend (`ConfiguracoesBrandingPage.tsx`) e suíte de testes unitários (`test_validacao_tamanho_imagem_branding_5mb`).
2. **Emenda E002 (Inversão de Imagens, Remoção de Mídia e Alinhamento PDF):** 
   - **Correção da Base e Alinhamento:** Resolução de inversão decorrente de upload inadvertido no campo de logotipo em vez de rubrica. Realocada a assinatura para `representante_assinatura` e expurgado o campo `logotipo`.
   - **ReportLab Platypus:** No `ExtratoPdfService`, alinhamento centralizado explícito `ass_flowable.hAlign = 'CENTER'` no bloco de encerramento do representante e `logo_flowable.hAlign = 'LEFT'` no cabeçalho do documento, assegurando renderização impecável.
   - **Exclusão Física no Backend:** Adicionados os campos `remover_logotipo` e `remover_assinatura` em `ConfiguracaoBrandingAdminSerializer.update()`, garantindo exclusão física dos arquivos no storage quando solicitado pelo usuário.
   - **Interface e Usabilidade:** Em `ConfiguracoesBrandingPage.tsx`, diferenciação visual evidente entre o Card 1 (Cabeçalho Superior / Logotipo) e Card 4 (Rodapé / Chancela Pericial do Representante), além de botões dedicados de exclusão ("Remover Logotipo" e "Remover Rubrica").

### Impacto das Emendas por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.core.validators` | `regra-alterada` | Ampliação da constante `TAMANHO_MAXIMO_IMAGEM_BRANDING_BYTES` de 2 MB para 5 MB em `validar_imagem_branding` (E001). |
| `_reversa_sdd/architecture.md` | `backend/apps.core.serializers` | `regra-alterada` | Inclusão de suporte a `remover_logotipo` e `remover_assinatura` com exclusão física de mídias no método `update()` de `ConfiguracaoBrandingAdminSerializer` (E002). |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.pdf_service` | `regra-alterada` | Alinhamento explícito `hAlign = 'CENTER'` para rubrica sobre a linha de assinatura e `hAlign = 'LEFT'` para logotipo corporativo no cabeçalho (E002). |
| `_reversa_sdd/architecture.md` | `frontend/src/pages` | `componente-alterado` | Adição de botões de remoção de mídia e rotulagem contextual (Cabeçalho vs Rodapé) em `ConfiguracoesBrandingPage.tsx` (E001 e E002). |
| `_reversa_sdd/domain.md` | `core` | `regra-alterada` | **RN-BRANDING-03:** Limite máximo de upload para imagens institucionais elevado para 5.0 MB com validação de formato mantida (E001). |
| `_reversa_sdd/domain.md` | `contratos` | `regra-alterada` | **RN-BRANDING-04:** Padronização visual da rubrica pericial centralizada e garantia de exclusão/limpeza de imagens (E002). |

### Regras sob vigilância complementares

- `W006`: Validação estrita de limite de upload de imagens até 5.0 MB e recusa de arquivos superiores. Ver `_reversa_forward/013-branding-empresa-suporte/regression-watch.md`.

