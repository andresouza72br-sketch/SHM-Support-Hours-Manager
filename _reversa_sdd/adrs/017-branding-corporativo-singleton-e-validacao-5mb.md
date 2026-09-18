# ADR 017: Parametrização Unificada de Branding Corporativo (Singleton & Validação Estendida de Mídias 5 MB)

## Status
Aprovado 🟢

## Contexto
O SHM utilizava dados institucionais estáticos e textos fixos no código-fonte para cabeçalhos de relatórios, rodapés de e-mails transacionais e títulos de interface.
Isso impedia a personalização para diferentes prestadoras de serviços de suporte, forçava alteração de código para simples atualizações cadastrais (razão social, telefone de suporte ou e-mail de atendimento) e não permitia a aposição da assinatura ou rubrica digitalizada do responsável técnico para autenticação formal dos extratos.

## Decisão
1. Criar o modelo Singleton `ConfiguracaoBranding` no app `core` (`shm_configuracao_branding`), garantindo instância única com id fixo (`id=1`) e travas contra criação inadvertida de múltiplos registros.
2. Centralizar todos os metadados corporativos da prestadora: Razão Social, Nome Fantasia, CNPJ, Logotipo Corporativo, Telefone de Suporte, E-mail de Atendimento, URL base, Slogan, Endereço Completo e Dados do Representante Legal (Nome, Cargo, Documento Profissional e Rubrica Digitalizada).
3. Aplicar validação estrita de CNPJ com cálculo de dígitos verificadores da Receita Federal.
4. Ampliar o teto de upload de arquivos de imagem de 2 MB para **5.0 MB** (`validar_imagem_branding`, Emenda E001) com inspeção por Pillow, assegurando nitidez pericial de logotipos de alta resolução e rubricas vetoriais/rasterizadas.
5. Injetar dinamicamente os dados institucionais e rubrica nos compiladores de PDF (`ExtratoPdfService`), e-mails transacionais (`EmailService`) e navbar da SPA (`Header.tsx`).
6. Garantir o **Princípio da Não-Retroatividade Forense**: novos dados de branding afetam unicamente emissões futuras; arquivos PDF já gravados e com hash SHA-256 no passado permanecem inalterados (ISO/IEC 27037).
7. Proteger o endpoint administrativo `/api/v1/admin/branding/` com controle de privilégio estrito para `EMPRESA_ADMIN` e superusuários (RBAC).

## Consequências
- Personalização total do sistema sem necessidade de alterações no código.
- Extratos de prestação de contas com chancela pericial completa e representação jurídica válida.
- Segurança e integridade de dados fiscais garantidas por validação matemática e controle de acesso estrito.
