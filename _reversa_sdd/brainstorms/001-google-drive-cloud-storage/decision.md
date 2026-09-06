# Decision, google-drive-cloud-storage

> Selo 🟡 PLANEJADO. Decisão humana registrada, sujeita a revisão.

## Problema de referência
🟡 Quando um cliente ou técnico fizer upload de arquivos ou gerar relatórios no SHM, eu quero que o sistema grave e responda localmente na VPS de forma rápida e organizada por pasta de cliente, e copie de forma espelhada para o Google Drive corporativo do SHM compartilhando a respectiva pasta com a conta Google do cliente, para conseguir alta velocidade de resposta, redundância em nuvem e autonomia de backup para o cliente.

## Placar
| Opção | Job to be done | Esforço (5=barato) | Risco residual | Custo no legado | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| **Opção Híbrida — VPS Local-First + Espelho Google Drive & Compartilhamento** | 5 | 3 | 4 | 4 | **16** |
| **Opção A — Integrador Direto Puro na Google Drive API** | 3 | 3 | 3 | 3 | **12** |
| **Opção B — Abstração Multi-Tenant com Drive Individual Puro** | 4 | 2 | 2 | 2 | **10** |
| **Opção Não construir — Purge Local na VPS** | 1 | 5 | 1 | 5 | **12** |
| **Opção Usar algo pronto — Mount rclone / FUSE** | 3 | 4 | 2 | 4 | **13** |

🟡 *Nota do placar:* O modelo Híbrido (VPS Local-First + Espelhamento Google Drive) atinge a pontuação máxima (16/20). Ele elimina a latência e o risco de timeout de rede para downloads/uploads dos usuários, simplifica o manuseio no Django e entrega o valor imediato de backup compartilhado no Google Drive corporativo de 5 TB.

## Recomendação do Arbiter
🟡 Arquitetura Híbrida (VPS Local-First com Background Sync e Compartilhamento de Pastas no Google Drive Corporativo via Service Account JSON).

## O que se perde ao escolher ela
🟡 Os arquivos continuam ocupando disco local na VPS (embora agora de forma estruturada e previsível por cliente), exigindo monitoramento do volume do servidor ou política de arquivamento para chamados muito antigos. Em contrapartida, ganha-se desempenho instantâneo e robustez operacional contra quedas de internet.

## Em que condição a recomendação muda
🟡 Mudaria apenas se a VPS tivesse restrição drástica de disco (ex.: menos de 5 GB disponíveis) que impedisse reter os arquivos localmente.

## Decisão do usuário
🟡 Arquitetura Híbrida adotada e ratificada por André Souza em 2026-09-06T11:38:21-03:00:
1. **Armazenamento Primário na VPS:** Arquivos salvos e servidos diretamente pela VPS em estrutura organizada por cliente (`/media/clientes/{cliente_id}/...`), atendendo banco de dados, uploads e streaming de MP3 com máxima velocidade.
2. **Espelhamento Contínuo no Google Drive Corporativo (`proj.eng.sw@gmail.com`):** Cópias sincronizadas utilizando a chave JSON da Service Account já configurada no SHM (com APIs ativadas: Drive, Calendar, Gmail).
3. **Compartilhamento de Pastas com o Cliente:** A pasta do cliente criada no Drive corporativo é compartilhada com o email Google do cliente (que realiza login no SHM via OAuth Google), permitindo a ele consultar e copiar backups para o seu próprio Drive.

## Divergência registrada
*(Ausente — convergência total entre a reformulação do usuário e o refinamento do Arbiter).*

## A validar antes de comprometer
🟡 Validar via teste com Service Account JSON a criação de pasta no Google Drive corporativo e a concessão de permissão de visualização/leitura (`role: reader`) para o email do cliente.

## Riscos aceitos conscientemente
🟡 Aceita a manutenção do espaço em disco na VPS para resposta rápida; aceita gerenciar fila/rotina de sincronização assíncrona com o Google Drive para manter o espelhamento íntegro sem travar os workers web.

---
Gerado por reversa-arbiter em 2026-09-06T11:40:00-03:00  
Sessão: 001-google-drive-cloud-storage
