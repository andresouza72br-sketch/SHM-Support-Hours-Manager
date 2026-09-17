# Adendo de Convergência SDD — Feature 012: Design e Emissão do Extrato Oficial de Contrato em PDF Vetorial com Envio Mensal Automatizado e Raio-X em Tempo Real

> **Identificador:** `012-extrato-contrato-weasyprint`  
> **Data:** `2026-09-17`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-17.

## Resumo da entrega

Implementada a arquitetura completa de geração, emissão e despacho do Extrato Oficial de Prestação de Contas em PDF vetorial padronizado A4, eliminando a dependência da impressão legada do navegador (`window.print()`). O documento conta com arquitetura Dual-Engine: compilação server-side de alta fidelidade via WeasyPrint com CSS Paged Media (`@page`, cabeçalhos repetidos e paginação dinâmica) no ambiente de produção, com chaveamento automático e transparente para o compilador vetorial nativo ReportLab Platypus em ambientes sem suporte a bibliotecas de SO (GTK/GObject). Cada arquivo binário gerado tem seu resumo criptográfico SHA-256 calculado, estampado no rodapé de todas as páginas e registrado imutavelmente na tabela `ContratoAuditLog` e no novo modelo `ExtratoOficialGerado`. Os arquivos são armazenados no storage híbrido local da VPS sob `/media/clientes/{cliente_id}/contratos/{id}/extratos/` e espelhados de forma assíncrona para a pasta do cliente no Google Drive corporativo.

A funcionalidade entrega governança de despacho em lote no 1º dia útil de cada mês (`enviar_extratos_mensais`) para contratos com movimentação contábil, e despacho sob demanda por e-mail com seleção interativa de destinatários confirmados no modal `EnviarExtratoModal.tsx`.

Adicionalmente, conforme especificação de aditivo (`RN-08`), o extrato opera como um **"Raio-X Contínuo em Tempo Real"** desde o início da vigência do contrato até o presente minuto, apurando compulsoriamente todas as demandas em andamento (orçamentos aguardando aprovação - Fluxo A2, chamados em execução técnica e entregas aguardando aceite final - Fluxo A3). O sistema calcula e estampa o **Saldo Projetado Pós-Aceites** e emite alerta visual ostensivo de **"Previsão de Estouro de Franquia"** no PDF e no frontend caso a projeção aponte saldo negativo. Na interface web `ExtratoContratoPage.tsx`, o painel de métricas foi expandido para 4 cards, acompanhado de barra de conciliação dedutiva e tabela dedicada de chamados ativos.

Total de 21 ações atômicas concluídas com sucesso (T001 a T021), suíte de testes com 9/9 testes passando no `pytest` (`test_extrato_pdf.py`) e build de produção do frontend validado com zero erros no `npm run build`.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.models` | `componente-novo` | Adição do modelo `ExtratoOficialGerado`, enum `OrigemExtrato`, helper `caminho_extrato_contrato` e novos eventos de auditoria `ENVIO_RELATORIO` e `ENVIO_MENSAL_RELATORIO`. |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.pdf_service` | `componente-novo` | Serviço `ExtratoPdfService` com arquitetura Dual-Engine (ReportLab Platypus e WeasyPrint), cálculo de hash SHA-256, persistência local e espelhamento Google Drive. |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.templates` | `componente-novo` | Template `contratos/extrato_oficial.html` semântico com grid de KPIs, demonstrativo dedutivo de projeção contábil, tabela do Raio-X de demandas e selo forense SHA-256. |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.services` | `regra-alterada` | `ContratoService.obter_dados_extrato` apura em tempo real demandas em andamento (A2 orçamento, execução, A3 entrega) e calcula a projeção matemática de saldo pós-aceites. |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.email_service` | `regra-alterada` | Método `enviar_extrato_oficial_email` com anexo do PDF binário, corpo formal institucional e registro de auditoria forense. |
| `_reversa_sdd/architecture.md` | `backend/endpoints` | `delta-de-contrato-externo` | Novos endpoints `@action` REST em `ContratoViewSet`: `extrato_pdf` (download autenticado), `destinatarios_extrato` (elegíveis confirmados) e `enviar_extrato_email` (despacho manual). |
| `_reversa_sdd/architecture.md` | `backend/apps.contratos.commands` | `componente-novo` | Comando administrativo `enviar_extratos_mensais` para faturamento e despacho periódico no 1º dia útil de cada mês. |
| `_reversa_sdd/architecture.md` | `frontend` | `componente-alterado` | `ExtratoContratoPage.tsx` com 4 cards de métricas, banner crítico de alerta de estouro, demonstrativo dedutivo e tabela do Raio-X; `EnviarExtratoModal.tsx` para seleção de destinatários. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-EXTRATO-01:** Substituição definitiva da impressão legada de navegador por compilação determinística server-side de PDF vetorial A4. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-EXTRATO-02:** Carimbo criptográfico de integridade forense SHA-256 estampado em todas as páginas e registrado no histórico pericial (ABNT NBR ISO/IEC 27037). |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-EXTRATO-03:** Governança de envio mensal periódico no 1º dia útil às 08:00 para contratos com movimentação contábil. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-08:** Raio-X contínuo em tempo real até o presente minuto e cálculo de Saldo Projetado Pós-Aceites com alerta de estouro de franquia. |

## Regras sob vigilância

- `W001`: Resiliência de motor PDF (Dual-Engine): contingência transparente para ReportLab Platypus caso WeasyPrint não encontre dependências nativas de C/GTK no ambiente. Ver `_reversa_forward/012-extrato-contrato-weasyprint/regression-watch.md`.
- `W002`: Isolamento multi-tenant de acesso: downloads e disparos de extrato restritos a administradores da prestadora e gestores do respectivo tomador (403 Forbidden). Ver `_reversa_forward/012-extrato-contrato-weasyprint/regression-watch.md`.
- `W003`: Respeito à supressão do autor da ação nas notificações e e-mails de extrato. Ver `_reversa_forward/012-extrato-contrato-weasyprint/regression-watch.md`.
- `W004`: Idempotência de envio mensal e supressão para contratos sem movimentação contábil no período. Ver `_reversa_forward/012-extrato-contrato-weasyprint/regression-watch.md`.
- `W005`: Integridade contábil e consistência na apuração do saldo projetado e demandas pendentes. Ver `_reversa_forward/012-extrato-contrato-weasyprint/regression-watch.md`.

## Fontes

- `_reversa_forward/012-extrato-contrato-weasyprint/requirements.md`
- `_reversa_forward/012-extrato-contrato-weasyprint/roadmap.md`
- `_reversa_forward/012-extrato-contrato-weasyprint/data-delta.md`
- `_reversa_forward/012-extrato-contrato-weasyprint/legacy-impact.md`
- `_reversa_forward/012-extrato-contrato-weasyprint/regression-watch.md`
- `_reversa_forward/012-extrato-contrato-weasyprint/actions.md`
- `_reversa_forward/012-extrato-contrato-weasyprint/progress.jsonl`
