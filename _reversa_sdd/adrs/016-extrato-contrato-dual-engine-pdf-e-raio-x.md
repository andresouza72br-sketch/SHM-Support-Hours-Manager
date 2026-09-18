# ADR 016: Arquitetura Dual-Engine para Extrato Oficial em PDF Vetorial e Raio-X em Tempo Real

## Status
Aprovado 🟢

## Contexto
O sistema SHM dependia de renderização pelo navegador com `window.print()` para a geração de relatórios de contratos. Esse modelo apresentava três deficiências críticas:
1. **Quebra de Layout e Falta de Padronização:** Cada navegador e sistema operacional aplicava margens, fontes e quebras de página divergentes, impedindo a emissão de extratos com fidelidade pericial.
2. **Inexistência de Integridade Criptográfica Server-Side:** Não era possível calcular o hash SHA-256 do binário PDF para fins de conformidade com a ISO/IEC 27037 e cadeia de custódia.
3. **Visão Estática do Saldo:** O extrato desconsiderava as demandas já em atendimento, induzindo o tomador a erro sobre sua disponibilidade real de franquia.

## Decisão
1. Adotar a compilação server-side de PDF vetorial A4 de alta fidelidade com **Arquitetura Dual-Engine**:
   - **Motor Primário (WeasyPrint):** Renderização baseada em HTML/CSS Paged Media (`@page`, paginação dinâmica `counter(page)` e repetição de cabeçalhos).
   - **Motor de Contingência (ReportLab Platypus):** Renderizador vetorial nativo em Python puro, ativado de forma transparente e resiliente caso dependências C de sistema (GTK/GObject) não estejam disponíveis.
2. Calcular compulsoriamente o resumo criptográfico SHA-256 sobre o arquivo PDF emitido, estampando o selo forense no rodapé e persistindo em `ExtratoOficialGerado` e `ContratoAuditLog`.
3. Implementar a regra de negócio `RN-08` do Raio-X em Tempo Real: apurar compulsoriamente todas as demandas em andamento (orçamentos pendentes, atendimentos em execução e entregas aguardando aceite) e calcular o **Saldo Projetado Pós-Aceites**, disparando alerta ostensivo em caso de projeção de estouro.
4. Implementar comando administrativo `enviar_extratos_mensais` para faturamento e despacho automatizado no 1º dia útil de cada mês.

## Consequências
- Extratos com precisão tipográfica milimétrica em qualquer ambiente de hospedagem.
- Prova pericial autônoma com rastreabilidade forense indelével.
- Maior transparência e governança orçamentária entre prestadora e tomador.
