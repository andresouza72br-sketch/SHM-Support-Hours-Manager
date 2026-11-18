# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Operação Híbrida**:
  - **Gestores e Administradores (Consultoria de TI)**: Gestão centralizada de contratos, franquia de horas, decomposição de pedidos em ciclos atômicos, alocação de técnicos, conciliação e faturamento.
  - **Equipe Técnica / Desenvolvedores**: Execução de ciclos de serviço (Corretiva, Evolutiva, Preventiva, etc.), apontamento de horas reais, discussões em threads contextuais e agendamentos técnicos.
  - **Tomadores de Serviço / Clientes (Diretores, Gestores de TI, Fiscais)**: Acompanhamento transparente do saldo e consumo em tempo real, aprovação ágil de orçamentos e aceites de entrega sem fricção de login (Magic Links em smartphones e desktop), e avaliação de satisfação (CSAT).

## Product Purpose
O SHM (Support Hours Manager) elimina a desconfiança, a perda de lucratividade e o atrito na prestação de serviços de TI. Fraciona chamados monolíticos em ciclos atômicos e garante que o saldo de franquia só seja debitado após o aceite formal do cliente baseado em horas reais executadas, sustentado por conciliação contábil atômica e blindagem jurídica.

## Positioning
O único ecossistema de gestão de contratos e horas técnicas com auditoria forense criptográfica nativa (Trilha DNA encadeada com SHA-256 e RFC 8785) e débito exclusivo no aceite formal do cliente. Proteção mútua bilateral: a matemática e a criptografia atuam como árbitro imparcial do contrato.

## Operating Context
- Aplicação web responsiva (desktop denso para gestão/desenvolvimento e mobile/desktop para aprovações instantâneas de clientes).
- Fluxo de trabalho: abertura de pedidos (OS) → decomposição em ciclos atômicos orçados → aprovação de orçamento pelo tomador → execução com apontamento de horas → solicitação de aceite formal → débito contábil automático das horas reais → conciliação e compensação de saldos entre contratos.
- Emissão de extrato contratual oficial em PDF de alta fidelidade (dual-engine WeasyPrint/ReportLab) e agendamento de suporte via Google Meet (módulo Schedule).

## Capabilities and Constraints
- **Decomposição em Ciclos Atômicos**: Tipos de ciclo (Corretiva, Evolutiva, Preventiva, Análise, Consultoria, Treinamento) com orçamentos individuais.
- **Débito Exclusivo no Aceite**: O saldo da franquia nunca é debitado antecipadamente na aprovação do orçamento.
- **Trava de Tolerância (+30%)**: Consumo real além da margem exige justificativa técnica obrigatória e autorização especial.
- **Transacionalidade Atômica (`@transaction.atomic`)**: Conciliação de saldos e compensação de débitos entre contratos protegidos por travas de teto.
- **Imutabilidade Pericial**: Trilha forense protegida na camada física por triggers de banco de dados (`trg_forensic_audit_immutability`) e selo noturno diário consolidado (`AuditDailySeal`).
- **Magic Links Seguros**: Tokens UUID descartáveis para validação e aprovação em 1 clique sem requerer login do cliente.
- **Storage Híbrido Local-First**: Persistência local imediata na VPS e espelhamento assíncrono para o Google Drive com integridade SHA-256 em streaming.

## Brand Commitments
- **Nome**: SHM — Support Hours Manager (versão 2.6 "Branding").
- **Identidade Corporativa Singleton**: `ConfiguracaoBranding` centralizado para logotipo corporativo (até 5MB) e dados institucionais com validação estrita de CNPJ perante a Receita Federal.
- **Tom de Voz**: Rigor técnico, clareza jurídica, transparência contratual e excelência em engenharia de software (Manifesto de Engenharia).

## Evidence on Hand
- Código-fonte ativo: Frontend SPA React 19 + TypeScript + Tailwind CSS (`frontend/`) e Backend Django 5.2 + PostgreSQL (`backend/`).
- 205+ testes automatizados passando (Pytest), assegurando TDD e padrões GoF.
- Especificações SDD vivas consolidadas em `_reversa_sdd/`.
- Documentação pericial pública e privada viva (`/publico/auditoria-forense`).
- Manifesto de Engenharia em `Manifesto/manifesto.md`.

## Product Principles
1. **Integridade e Não-Repúdio**: Cada movimentação contábil ou operacional gera elo imutável na fita DNA (SHA-256 / RFC 8785); o código é árbitro imparcial.
2. **Débito Exclusivo no Aceite**: O saldo contratual pertence ao cliente até que a entrega seja formalmente aceita com base em horas reais.
3. **Decisão com Zero Atrito**: A tomada de decisão pelo cliente (orçamentos e entregas) é instantânea, móvel e sem fricção de senhas.
4. **Decomposição Atômica**: Eliminação de chamados monolíticos opacos; todo trabalho é fragmentado, orçado e auditado.
5. **Transparência Matemática**: Extratos oficiais e réguas de conciliação que explicam matematicamente cada centésimo de hora.

## Accessibility & Inclusion
- Conformidade WCAG 2.1 nível AA: contraste elevado para auditoria e status de ciclos, navegação fluida por teclado, timeline pericial legível por tecnologias assistivas e design responsivo para smartphones e desktops.
