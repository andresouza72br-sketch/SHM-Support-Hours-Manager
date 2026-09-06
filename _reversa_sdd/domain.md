# Regras de Negócio e Modelo de Domínio — SHM 2.5.0

> Gerado pelo **Reversa Detective** em 2026-09-05  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**  
> Escala de Confiança: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Glossário de Termos de Domínio

- **Tomador / Cliente:** Organização (Pessoa Jurídica) ou indivíduo (Pessoa Física) contratante dos serviços de suporte técnico.
- **Contrato de Suporte (CT-YYYY-NNNN):** Instrumento jurídico que estabelece a franquia de horas contratadas, vigência e regras de carência.
- **Carência Contratual:** Período de tolerância de 30 dias após o término formal da vigência no qual o saldo remanescente ainda pode ser utilizado em atendimentos.
- **Pedido de Suporte (OSYYYYMMNNNN):** Chamado ou demanda técnica aberta pelo cliente, servindo como agrupador de ciclos.
- **Ciclo Técnico:** Unidade atômica de trabalho e faturamento decomposta a partir de um pedido, com orçamentação e aceite individualizados.
- **Orçamento de Ciclo:** Estimativa prévia de horas necessárias para executar o ciclo, submetida para aprovação do cliente.
- **Trava de Tolerância (+30%):** Regra de governança que bloqueia a solicitação de aceite de ciclos cujas horas realizadas excedam em mais de 30% as horas estimadas no orçamento aprovado, exigindo justificativa técnica explícita.
- **Aceite de Ciclo:** Ato formal e irrevogável no qual o tomador homologa a entrega técnica do ciclo, disparando o débito financeiro imediato no ledger de saldo do contrato.
- **Ledger de Saldo (Livro-Razão):** Histórico append-only imutável de todas as movimentações de horas (consumo, transferência, reabastecimento e estorno).
- **Migração de Saldo:** Procedimento contábil transacional que transfere saldo positivo remanescente de contrato vencido/expirado para um novo contrato ativo do mesmo cliente.
- **Compensação de Débito:** Procedimento contábil que deduz horas da franquia do novo contrato para liquidar o saldo devedor (negativo) de um contrato anterior.
- **Magic Link:** Link seguro contendo token criptográfico UUIDv4 de uso único, permitindo aprovações sem necessidade de login prévio.

---

## 2. Invariantes e Regras de Negócio Fundamentais

### RN-01: Débito Exclusivo no Aceite Formal 🟢
- A aprovação do orçamento **não** debita saldo do contrato.
- O débito no contrato ocorre **única e exclusivamente** no momento em que o cliente concede o aceite formal do ciclo.
- O valor debitado corresponde estritamente às **horas reais realizadas** (`horas_realizadas`), e não às horas estimadas.

### RN-02: Imutabilidade do Livro-Razão (Ledger) 🟢
- Registros na tabela `HistoricoSaldo` jamais são alterados ou excluídos (`UPDATE` e `DELETE` proibidos).
- Correções ou cancelamentos devem ser lançados como novas entradas do tipo `ESTORNO` com apontamento para o ID da operação original.
- Cada entrada registra o saldo resultante (`saldo_resultante`), servindo como prova de conciliação matemática.

### RN-03: Trava de Tolerância de Horas Excedentes (+30%) 🟢
- O teto de tolerância operacional é calculado como `limite = round(horas_estimadas * 1.30, 2)`.
- Caso `horas_realizadas > limite`:
  1. A solicitação de aceite é interceptada e exige campo `justificativa_excedente` obrigatório e não-vazio.
  2. Um evento de alerta é inserido na timeline do chamado e despachado para o gestor do contrato.
  3. A tela de aceite destacará visualmente o excesso de horas orçadas vs realizadas para ciência expressa do tomador.

### RN-04: Migração Atômica de Saldo Entre Contratos 🟢
- A migração de saldo é permitida **somente** entre contratos pertencentes ao mesmo `cliente_id`.
- O contrato de origem deve possuir status `expirado` ou `concluido` (ou data de término ultrapassada) e apresentar saldo estritamente positivo (`saldo > 0`).
- A transação adquire locks pessimistas (`select_for_update`) ordenados lexicograficamente por ID para prevenir deadlocks.
- São gerados simultaneamente: um registro `TRANSFERENCIA_ENVIO` no contrato de origem e um `TRANSFERENCIA_RECEBIMENTO` no contrato de destino, com registro em `ContratoAuditLog`.

### RN-05: Compensação de Saldo Devedor Anterior 🟢
- Contratos com saldo negativo (`saldo < 0`) podem ter sua dívida liquidada utilizando horas da franquia inicial de um novo contrato do mesmo cliente.
- O teto máximo de dedução da franquia do novo contrato é limitado rigidamente ao valor absoluto da dívida (`abs(saldo_devedor)`).
- O novo contrato precisa possuir saldo suficiente para cobrir o abatimento pretendido.

### RN-06: Integridade Documental Criptográfica SHA-256 🟢
- Todos os anexos e arquivos contratuais têm seu hash SHA-256 calculado no momento do upload.
- O sistema disponibiliza verificação em tempo real comparando o hash gravado no banco com o hash recalculado do arquivo físico em storage.

### RN-07: Central Declarativa de Notificações 🟢
- Os eventos do sistema são classificados em 6 categorias de domínio.
- As regras de despacho respeitam os toggles configurados por evento para envio por e-mail e geração de notificação in-app, além da matriz de destinatários por papel.

### RN-08: Invariante Universal In-App — Sininho sem Auto-Alerta 🟢
- O usuário autor da ação conectado **nunca** recebe notificações no sininho in-app (`Notification`) decorrentes de suas próprias ações (`destinatarios_in_app.discard(autor)`).
- A regra é estrita e independe das permissões do usuário ou dos papéis RBAC habilitados na configuração do evento, protegendo a credibilidade do sininho contra auto-alertas e ruído.

### RN-09: Supressão Declarativa de E-mail para o Autor da Ação 🟢
- O modelo `ConfiguracaoNotificacao` disponibiliza o controle booleano `nao_enviar_autor` (com padrão `True` nos 14 eventos operacionais e `False` nos 8 eventos de convites/autenticação/sistema).
- Quando `nao_enviar_autor == True`, a resolução de destinatários expurga o usuário autor de `destinatarios_usuarios` e elimina seu e-mail da lista de cópia (`emails_cc`) com comparação case-insensitive.
- Administradores da empresa podem desativar a supressão por evento via interface administrativa caso desejem receber cópia de comprovação por e-mail.

### RN-10: Agendamento de Reuniões, Google Meet e Lembretes Escalonados 🟢
- Reuniões devem ser agendadas para datas futuras vinculadas obrigatoriamente a um Cliente.
- Usuários com papel de cliente só podem agendar compromissos para sua própria organização (Multi-Tenant).
- Toda reunião criada gera programaticamente 3 lembretes determinísticos (`24h`, `30m`, `15m` antes).
- Se a integração com Google Calendar estiver habilitada, provisiona automaticamente sala Google Meet persistindo `google_meet_link`.
- Cancelamentos exigem justificativa obrigatória e gravam evento imutável na trilha forense.

### RN-11: Captura e Gravação de Áudio no Navegador com Encode MP3 🟢
- Anexos de voz em chamados são gravados diretamente pelo microfone do usuário no cliente via Web Audio API.
- A codificação PCM para MP3 ocorre 100% no navegador utilizando a biblioteca `@breezystack/lamejs`, descarregando a CPU do servidor e transmitindo o anexo já compactado (`audio/mp3`) no multipart form data.

### RN-12: Armazenamento Híbrido Local-First com Espelhamento Google Drive 🟢
- **Resposta Síncrona na VPS:** Todo arquivo anexado a pedidos ou ciclos é gravado localmente na VPS em `/media/clientes/{cliente_id}/...`, permitindo respostas com latência zero e streaming imediato de áudio sem depender de serviços de terceiros.
- **Auditoria Criptográfica:** O cálculo de integridade SHA-256 é realizado via streaming em chunks de 64KB no momento da persistência e gravado de forma imutável nos modelos.
- **Espelhamento Assíncrono (`on_commit`):** O upload para o Google Drive corporativo ocorre após o commit da transação de banco em thread de background, garantindo que instabilidades externas não afetem a experiência do usuário.
- **Compartilhamento Restrito por Cliente:** A pasta raiz do cliente no Google Drive (`[SHM] {Nome} (ID: {id})`) é compartilhada unicamente com o `email_google_drive` informado no cadastro (`role: reader`), mantendo isolamento estrito sem links públicos.
- **Expurgo em Cascata:** Ao remover um anexo na VPS, a deleção física aciona a remoção do arquivo espelhado correspondente no Google Drive.
- **Contingência e Retentativa:** Arquivos pendentes ou com falha de conexão permanecem registrados como `PENDENTE` em `RegistroSincronizacaoDrive` para reprocessamento por comando administrativo CLI (`sincronizar_storage_drive`).

