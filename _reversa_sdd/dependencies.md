# Dependências do Sistema — SHM (Support Hours Manager)

> Gerado pelo **Reversa Scout** em 2026-09-18  
> Versão do Sistema: **SHM 2.6 (Release 2.6 Branding)**  

---

## 1. Backend (Python / Django)

| Pacote | Versão | Propósito | Categoria |
|---|---|---|---|
| `Django` | `>=5.0,<6.0` (5.2.17) | Framework web MVC e ORM principal | Framework Core |
| `djangorestframework` | `>=3.15.0` | Toolkit para construção de APIs RESTful | API Framework |
| `django-cors-headers` | `>=4.3.1` | Gerenciamento de cabeçalhos CORS | Segurança / Rede |
| `djangorestframework-simplejwt` | `>=5.3.1` | Autenticação via tokens JWT com rotação e blacklist | Segurança / Auth |
| `drf-spectacular` | `>=0.28.0` | Geração OpenAPI 3.0 e UI Swagger / Redoc | Documentação API |
| `django-filter` | `>=24.2` | Filtragem declarativa de querysets | API Querying |
| `validate-docbr` | `>=2.0.0` | Validação matemática estrita de CPF e CNPJ | Domínio / Validação |
| `psycopg2-binary` | `>=2.9.9` | Driver de conexão PostgreSQL | Banco de Dados |
| `Pillow` | `>=10.2.0` | Processamento de imagens, logos corporativos e rubricas digitais | Mídia / Arquivos |
| `python-dotenv` | `>=1.0.1` | Carregamento de variáveis de ambiente | Configuração |
| `google-auth` | `>=2.0.0` | Validação de tokens de ID do Google OAuth | Autenticação Externa |
| `requests` | `>=2.31.0` | Cliente HTTP síncrono para validações externas | Rede / HTTP |
| `weasyprint` | `>=61.0.0` | Motor server-side de compilação de HTML/CSS para PDF vetorial de alta fidelidade | Geração de Documentos / PDF |
| `reportlab` | `>=4.0.0` | Motor server-side vetorial nativo Platypus (Dual-Engine de contingência) | Geração de Documentos / PDF |
| `pytest` | `>=8.1.0` | Framework de testes unitários e de integração | Testes (Dev) |
| `pytest-django` | `>=4.8.0` | Integração do Pytest com o Django | Testes (Dev) |
| `factory-boy` | `>=3.3.0` | Fábricas de fixtures determinísticas para testes | Testes (Dev) |

---

## 2. Frontend (React / TypeScript)

| Pacote | Versão | Propósito | Categoria |
|---|---|---|---|
| `react` | `^19.0.0` | Biblioteca de componentes reativos de UI | Frontend Core |
| `react-dom` | `^19.0.0` | Renderizador DOM para React 19 | Frontend Core |
| `react-router-dom` | `^7.2.0` | Roteamento declarativo no cliente (SPA) | Roteamento UI |
| `@tanstack/react-query` | `^5.66.0` | Gerenciamento de estado assíncrono e cache de API | State Management |
| `axios` | `^1.7.9` | Cliente HTTP Promise com interceptors JWT | Comunicação HTTP |
| `lucide-react` | `^0.475.0` | Pacote de ícones SVG consistentes | Design System |
| `tailwindcss` | `^3.4.17` | Framework CSS utilitário para estilização | Estilização UI |
| `@breezystack/lamejs` | `^1.2.7` | Codificação de áudio PCM para MP3 no cliente | Mídia / Áudio |
| `clsx` | `^2.1.1` | Construtor condicional de classes CSS | Utilitário UI |
| `tailwind-merge` | `^3.0.1` | Mesclagem segura de classes Tailwind sem conflitos | Utilitário UI |
| `typescript` | `^5.7.3` | Tipagem estrita estática para JavaScript | Linguagem (Dev) |
| `vite` | `^6.1.0` | Bundler e servidor de desenvolvimento ultrarrápido | Build Tool (Dev) |
| `@vitejs/plugin-react` | `^4.3.4` | Plugin React para Vite com Fast Refresh | Build Tool (Dev) |
| `postcss` | `^8.5.2` | Processamento e transformação de CSS | Build Tool (Dev) |
| `autoprefixer` | `^10.4.20` | Prefixação automática de CSS para navegadores | Build Tool (Dev) |
