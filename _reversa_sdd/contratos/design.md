# Design do Módulo Contratos

## 1. Modelos
- `Contrato`: numero (`CT-YYYY-NNNN`), tipo (`novo`, `aditivo`, `renovacao`), cliente (FK), contrato_referencia (FK recursiva), data_inicio, data_termino, data_fim_carencia, horas_contratadas, saldo, status.
- `ContratoDocumento`: contrato (FK), arquivo, hash_sha256, tamanho_bytes, tipo_documento.
- `ContratoAuditLog`: contrato (FK), tipo_evento, justificativa, documento_hash, usuario, ip_origem, criado_em.
- `ForensicAuditLog`: particao, sequencia, tipo_evento, nivel_relevancia, payload_hash, previous_hash, current_hash, timestamp.
- `AuditDailySeal`: data_referencia, particao, ultima_sequencia, ultimo_hash, selo_digest, selado_em.
- `ContratoEmailNotificacao`: contrato (FK), email, nome, status (`pendente`, `confirmado`, `rejeitado`), token_confirmacao.
- `ExtratoOficialGerado`: contrato (FK), arquivo, periodo_referencia, hash_sha256, horas_contratadas, horas_consumidas, saldo_disponivel, creditos_migrados, debitos_compensados, quantidade_ciclos, origem, gerado_por (FK), destinatarios_notificados, gdrive_file_id, gdrive_file_url, sincronizado_drive_em.

## 2. Serviços Principais
- `ContratoService`: Regras de negócio de contratos, cálculo de carência, apuração em tempo real do Raio-X de demandas ativas (`obter_dados_extrato`), apuração de saldo projetado e auditoria desacoplada de migração de saldo.
- `ExtratoPdfService`: Compilação Dual-Engine de extrato oficial em PDF vetorial A4 (WeasyPrint CSS Paged Media `@page` com contingência transparente para ReportLab Platypus), injeção dinâmica de identidade corporativa (`ConfiguracaoBranding`), cálculo de hash SHA-256 sobre o binário, gravação local na VPS e despacho assíncrono para o Google Drive.
- `ContratoEmailService`: Despacho de e-mails transacionais de contratos, convites de opt-in para notificações e envio formal do Extrato Oficial com anexo do PDF e rodapé institucional.
- `ForensicAuditService`: Encadeamento criptográfico append-only (RFC 8785 determinístico + SHA-256), cálculo de selos noturnos diários e verificação pericial de higidez.

## 3. Endpoints REST
- `GET /api/v1/contratos/`: Listagem e filtragem de contratos.
- `GET /api/v1/contratos/{id}/extrato_pdf/`: Download autenticado do Extrato Oficial compilado em PDF vetorial.
- `GET /api/v1/contratos/{id}/destinatarios_extrato/`: Listagem de destinatários elegíveis confirmados para receber o extrato.
- `POST /api/v1/contratos/{id}/enviar_extrato_email/`: Despacho sob demanda do extrato por e-mail com seleção de destinatários.
- `GET /api/v1/contratos/{id}/trilha_forense/`: Consulta à cadeia criptográfica encadeada (ForensicAuditLog).
- `GET /api/v1/contratos/{id}/verificar_integridade_trilha/`: Verificação matemática em tempo real da cadeia RFC 8785.
- `GET /api/v1/contratos/{id}/verificar_integridade/`: Verificação de hash SHA-256 de documentos anexados.
