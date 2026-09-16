# Manual Prático de Utilização: SHM Cloud Storage & Google Drive

> **Documento Oficial de Orientação Operacional**  
> **Público-Alvo:** Clientes, Gerentes de Contas e Equipe Interna da Empresa  
> **Sistema:** SHM (Sistema Homologado de Manutenção e Suporte)  
> **Nível de Acesso:** Geral (Todos os usuários autenticados)

---

## 1. O que é o SHM Cloud Storage Híbrido?

O SHM conta com uma arquitetura de armazenamento híbrida (*Dual-Storage*) projetada para garantir **alta velocidade de acesso** no dia a dia e **segurança máxima de longo prazo** para todos os documentos e anexos.

```
+-------------------------------------------------------------------------------+
|                            USUÁRIO NO SISTEMA SHM                             |
|              (Faz upload de proposta, anexo de pedido ou comentário)          |
+---------------------------------------+---------------------------------------+
                                        |
                 1. Upload imediato     v
+-------------------------------------------------------------------------------+
|                      ARMAZENAMENTO LOCAL SHM (VPS Rápida)                     |
|  - Arquivo disponível instantaneamente na tela do pedido                     |
|  - Cálculo do carimbo digital de integridade (Hash SHA-256)                   |
+---------------------------------------+---------------------------------------+
                                        |
                 2. Espelhamento        v  (Assíncrono / Segundo plano)
+-------------------------------------------------------------------------------+
|                    GOOGLE DRIVE CORPORATIVO (Nuvem 5 TB)                      |
|  - Pasta exclusiva e restrita para cada cliente: "ID - Nome do Cliente"       |
|  - Organização automática em subpastas: "pedidos/" e "comunicacao/"           |
|  - Backup permanente com 5 Terabytes de espaço corporativo seguro             |
+-------------------------------------------------------------------------------+
```

### Principais Benefícios para Clientes e Gerentes:
* **Zero Risco de Perda:** Seus arquivos ficam salvos simultaneamente no servidor do SHM e na nuvem Google Drive.
* **Acesso Centralizado:** Você pode consultar seus anexos diretamente no sistema SHM ou abrir a pasta correspondente no seu aplicativo do Google Drive no computador ou celular.
* **Privacidade Total:** Cada cliente tem acesso exclusivo apenas à sua respectiva pasta. Nenhum arquivo é público.

---

## 2. Como Acessar sua Pasta no Google Drive

Quando seu cadastro é aprovado no SHM, uma pasta corporativa exclusiva é criada e compartilhada com o seu e-mail Google informado no cadastro.

### 📍 Onde a pasta fica localizada no Google Drive?

Por segurança e privacidade, a pasta corporativa pertence à infraestrutura central do SHM e é **compartilhada com você com permissão de leitura**. Por esse motivo, no Google Drive ela não surge na raiz do seu disco próprio, mas sim na seção de compartilhados:

1. Acesse o **[Google Drive](https://drive.google.com)** conectado com a sua conta autorizada.
2. No menu lateral esquerdo, clique em **"Partilhados comigo"** (ou *"Compartilhados comigo"*):
   * O ícone é representado por duas pessoas.
3. Você verá a pasta com o nome formatado:  
   `[ID] - [Nome da Sua Empresa]` (exemplo: `2 - Iate Clube de Brasilia`).

---

### ⭐ Dica de Ouro: Como colocar a pasta na sua tela inicial ("O meu disco")

Para não precisar entrar sempre em "Partilhados comigo", você pode criar um atalho direto na sua tela principal:

1. Na seção **"Partilhados comigo"**, clique com o **botão direito** sobre a pasta da sua empresa.
2. Escolha **"Organizar"** ➔ **"Adicionar atalho"** (ou tecle `Shift + Z`).
3. Selecione **"O meu disco"** e confirme em **"Adicionar atalho"**.
4. Pronto! A pasta agora aparecerá diretamente na sua página inicial do Google Drive, no app de desktop e no aplicativo do celular.

---

## 3. Como os Anexos são Organizados

Toda vez que você ou a equipe do SHM anexa um documento, o sistema organiza o arquivo automaticamente em duas subpastas:

```
📁 [ID] - [Nome do Cliente]/
│
├── 📁 pedidos/
│   └── 📄 Proposta_Tecnica_Julho_2026.pdf
│   └── 📄 Escopo_Servico_Manutencao.pdf
│
└── 📁 comunicacao/
    └── 📄 Ata_de_Reuniao_Alinhamento.pdf
    └── 📄 Relatorio_Tecnico_Mensal.pdf
```

* **`pedidos/`:** Contém os arquivos principais anexados na abertura ou análise de ordens de serviço e solicitações.
* **`comunicacao/`:** Contém os arquivos trocados nos ciclos de atendimento, pareceres de chamados e mensagens do chat.

### Tempo de Sincronização
* A sincronização ocorre **em segundo plano logo após o salvamento**.
* Leva geralmente entre **2 a 10 segundos** para o arquivo aparecer no Google Drive, dependendo do tamanho do arquivo.
* Você não precisa esperar a sincronização terminar para continuar usando o SHM.

---

## 4. Permissões, Segurança e Privacidade

Para proteger a integridade dos seus dados contratuais e técnicos:

* **Acesso Somente Leitura (`role: reader`):** O e-mail do cliente recebe acesso de visualização e download. Isso impede que arquivos sejam apagados acidentalmente ou sobrescritos por engano fora do fluxo do SHM.
* **Sem Links Públicos:** A pasta **não** possui link público de internet. Somente quem estiver autenticado com a conta Google autorizada consegue abrir ou baixar os documentos.
* **Isolamento de Clientes:** Um cliente nunca consegue visualizar pastas, nomes ou documentos de outros clientes do sistema.

---

## 5. Troca da Conta Gmail do Cliente (Procedimento Seguro)

Se o responsável técnico mudar de cargo, sair da empresa, ou se a sua empresa adotar uma nova conta do Google Workspace (ex.: de `antigo.responsavel@gmail.com` para `diretoria@minhaempresa.com.br`), a troca de e-mail deve ser feita imediatamente para preservar a segurança da informação.

### Como solicitar ou realizar a alteração:

1. **Pelo Painel do SHM (Gerente ou Administrador):**
   * Acesse o menu **Clientes** no painel do SHM.
   * Localize o cadastro da sua empresa e clique em **Editar**.
   * No campo **E-mail Google para Drive**, informe o novo e-mail Google (`@gmail.com` ou e-mail corporativo do Google Workspace).
   * Clique em **Salvar Alterações** (ou utilize a opção segura *Trocar E-mail do Drive*).

### O que acontece nos bastidores com total segurança?
O SHM executa um procedimento atômico de segurança:
1. **Revogação Imediata:** O sistema cancela e exclui a permissão do e-mail anterior diretamente no Google Drive. O antigo responsável perde o acesso imediatamente.
2. **Nova Concessão:** O novo endereço de e-mail é adicionado com permissão exclusiva de leitura na mesma pasta corporativa.
3. **Histórico e Auditoria:** O sistema grava um registro pericial inalterável contendo a data, hora, usuário que realizou a troca e o IP da conexão.
4. **Continuidade:** Todo o acervo documental anterior continua preservado na pasta, pronto para o novo responsável.

---

## 6. Perguntas Frequentes (FAQ)

### ❓ Não vejo a pasta no meu Google Drive. O que devo checar?
1. **Verifique a conta conectada:** Certifique-se de que você está logado no Google com o **mesmo e-mail** cadastrado no campo *E-mail Google para Drive* do SHM.
2. **Abra a aba correta:** Lembre-se de clicar em **"Partilhados comigo"** no menu lateral esquerdo do Drive. Pastas compartilhadas não aparecem em "O meu disco" até que você crie um atalho.
3. **Abra o link direto:** No SHM, na visualização dos seus dados de cliente ou do pedido, clique no botão **"Abrir Pasta no Drive"**.

### ❓ O e-mail cadastrado precisa ser `@gmail.com`?
Não necessariamente. Ele pode ser `@gmail.com` ou qualquer e-mail corporativo gerenciado pelo **Google Workspace** (ex.: `contato@minhaempresa.com.br`). Se o e-mail não tiver vínculo com os serviços do Google, o Google Drive não conseguirá vincular a permissão.

### ❓ Posso adicionar ou excluir arquivos diretamente na pasta do Google Drive?
Não. A pasta é configurada como **Somente Leitura** para o cliente. Todas as inclusões e exclusões de arquivos devem ser realizadas diretamente através do sistema SHM para garantir o registro forense, carimbo de tempo e cálculo do hash de integridade.

### ❓ O que acontece se eu excluir um pedido ou anexo no sistema SHM?
Quando um anexo é legalmente removido pelo sistema SHM, o arquivo correspondente é automaticamente expurgado do armazenamento local e do Google Drive corporativo, mantendo a conformidade e a LGPD.

---

> 📞 **Suporte SHM:** Em caso de dúvidas sobre permissões ou dificuldades de acesso à pasta da sua empresa, entre em contato pelo e-mail oficial de suporte: `andresouza72br@gmail.com`.
