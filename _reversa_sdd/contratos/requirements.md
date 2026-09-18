# Requisitos do Módulo Contratos

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Gestão completa do ciclo de vida contratual, regras de vigência e carência de 30 dias, custódia de documentos com integridade SHA-256, gestão de destinatários de notificações e trilha de auditoria periciável.

## 2. Requisitos Funcionais
- **RF-CON-01 (Must):** Numeração unívoca no padrão `CT-YYYY-NNNN` 🟢.
- **RF-CON-02 (Must):** Suporte a tipos `novo`, `aditivo` (com vínculo recursivo) e `renovacao` 🟢.
- **RF-CON-03 (Must):** Carência de 30 dias após data de término para consumo de saldo positivo remanescente 🟢.
- **RF-CON-04 (Must):** Armazenamento de arquivos com cálculo e gravação de hash SHA-256 no momento do upload 🟢.
- **RF-CON-05 (Must):** Endpoint de verificação de integridade documental (`/verificar_integridade/`) que compara o hash persistido contra o hash recalculado do arquivo em storage 🟢.
- **RF-CON-06 (Must):** Gestão de lista de e-mails de notificação (`ContratoEmailNotificacao`) com envio de convites de confirmação (tokens de 7 dias) e registro de opt-in 🟢.
- **RF-CON-07 (Must):** Trilha de auditoria periciável (`ContratoAuditLog`) registrando eventos de criação, alteração, upload, exclusão de documentos, migrações de saldo e convites de notificação 🟢.
- **RF-CON-08 (Must):** Trilha Forense Criptográfica Encadeada (`ForensicAuditLog`) utilizando o algoritmo determinístico RFC 8785 (JSON Canonicalization Scheme) e SHA-256 com monotonicidade estrita de sequência por partição 🟢.
- **RF-CON-09 (Must):** Consolidação noturna via Selo Diário de Integridade (`AuditDailySeal`) às 23:59:59 com geração de `selo_digest` SHA-256 do topo da cadeia 🟢.
- **RF-CON-10 (Must):** Garantia de Imutabilidade Estrita via gatilho PostgreSQL nativo (`trg_forensic_audit_immutability`) que rejeita comandos `UPDATE` e `DELETE` em nível de banco de dados 🟢.
- **RF-CON-11 (Must):** Emissão de Extrato Oficial de Contrato em PDF Vetorial server-side com arquitetura Dual-Engine (`WeasyPrint` primário e `ReportLab Platypus` de contingência), com carimbo de integridade SHA-256 em todas as páginas e registro em `ExtratoOficialGerado` 🟢.
- **RF-CON-12 (Must):** Apuração contínua em tempo real (Raio-X) de todas as demandas em andamento desde o início da vigência até o momento da emissão, calculando o Saldo Projetado Pós-Aceites e emitindo alerta crítico ostensivo de "Previsão de Estouro de Franquia" caso o saldo projetado seja negativo 🟢.
- **RF-CON-13 (Must):** Despacho mensal automatizado (`enviar_extratos_mensais`) no 1º dia útil de cada mês para contratos ativos com movimentação contábil, e despacho sob demanda por e-mail com seleção interativa de destinatários confirmados 🟢.

