# User Story: Emissão do Extrato Oficial de Contrato, Raio-X em Tempo Real e Branding Corporativo

> **Features Relacionadas:** `012-extrato-contrato-weasyprint` e `013-branding-empresa-suporte`  
> **Status:** 🟢 CONFIRMADO  

---

## 1. Visão do Usuário
Como **Gestor do Cliente (CLIENTE_GERENTE)** ou **Administrador da Prestadora (EMPRESA_ADMIN)**,
Quero consultar e emitir o Extrato Oficial de Prestação de Contas em PDF vetorial A4 de alta fidelidade com Raio-X em tempo real de todas as demandas em andamento,
Para que tenhamos transparência contábil absoluta sobre o consumo de franquia, previsão de saldo pós-aceites e comprovação pericial com hash SHA-256 e chancela do responsável técnico.

---

## 2. Critérios de Aceite

### Cenário 1: Visualização do Raio-X em Tempo Real e Métricas na Web
- **Dado** que um cliente gerente acessa `/contratos/{id}/extrato/` na SPA,
- **Quando** o painel carrega os dados,
- **Então** o sistema exibe 4 cards de métricas (Franquia Total, Horas Consumidas, Saldo Disponível e Saldo Projetado Pós-Aceites).
- **E** exibe a barra de conciliação dedutiva e a tabela de chamados ativos (demandas aguardando aprovação, em execução e entregues aguardando aceite).
- **E** caso o Saldo Projetado seja negativo, exibe banner crítico de alerta ostensivo: "Previsão de Estouro de Franquia".

### Cenário 2: Download do Extrato Oficial em PDF Vetorial
- **Dado** que o usuário clica no botão "Baixar Extrato Oficial (PDF)",
- **Quando** a requisição atinge `GET /api/v1/contratos/{id}/extrato_pdf/`,
- **Então** o backend compila o PDF server-side via WeasyPrint (ou ReportLab Platypus em contingência).
- **E** injeta dinamicamente o logotipo corporativo da prestadora e os dados fiscais do Singleton de Branding.
- **E** calcula o hash SHA-256 do arquivo gerado, estampa o resumo no rodapé de todas as páginas e persiste em `ExtratoOficialGerado`.
- **E** no encerramento estampa a chancela formal com a rubrica digitalizada do representante legal.

### Cenário 3: Despacho por E-mail Sob Demanda
- **Dado** que o usuário clica no botão "Enviar Extrato por E-mail",
- **Quando** o modal `EnviarExtratoModal` é aberto,
- **Então** o sistema lista apenas e-mails com opt-in confirmado (`status='confirmado'`).
- **E** ao confirmar o envio, dispara o PDF em anexo com corpo formal institucional e registra evento no log de auditoria.

### Cenário 4: Parametrização de Identidade Visual (Branding)
- **Dado** que um administrador da prestadora acessa `/configuracoes/branding`,
- **Quando** ele preenche Razão Social, CNPJ, contatos, faz upload de logotipo e rubrica (até 5.0 MB) e salva,
- **Então** o sistema valida matematicamente o CNPJ pela Receita Federal e valida a integridade das imagens com Pillow.
- **E** persiste os dados no registro Singleton `id=1` de `ConfiguracaoBranding`.
- **E** atualiza imediatamente o header da aplicação e todas as emissões futuras de extratos e e-mails.
