## Ideia original

Vamos fazer o storage do SHM, os arquivos de clientes uploads nos pedidos, mensagens, ciclos, etc, e quaisquer outros arquivos de backup, relatorios disponibilizados (para envio automatico/download pelo cliente), ou seja, teremos esta camada Cloud Storage, sera usado o Google Drive da conta Google do SHM: proj.eng.sw@gmail.com, ja dei permissão para app SHM na API la na Google.

Esta implementação tem corelação ao um item do backlog de melhorias, me guie e vamos distrinchar a melhor solução, quero que seja seguro, acoplavel, e user friendly, pois os usuarios do SHM podem fazer logim no OAuth Google, 

vamos lá....

## Reformulação / Refinamento da Arquitetura

A ideia é manter o armazenamento primário na VPS organizado por pasta de cada cliente (`/media/clientes/{cliente_id}/...`) para o SHM responder com alta velocidade a partir da VPS (banco de dados e arquivos de upload/áudios). 

Todas as pastas e arquivos são copiados de forma contínua/assíncrona para o Google Drive corporativo (`proj.eng.sw@gmail.com`), utilizando a chave JSON da Service Account já configurada no SHM (com as APIs do Google Drive, Google Calendar e Gmail ativadas). 

No Google Drive Corporativo, a pasta de cada cliente é compartilhada diretamente com a conta Google do respectivo cliente (que realiza login no SHM via Google OAuth). Dessa forma, o cliente obtém acesso compartilhado à sua pasta no Google Drive dele, podendo consultar cronologicamente e realizar backup para o seu próprio Drive quando desejar.
