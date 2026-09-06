# Tarefas do Módulo: Core & Storage Híbrido

> Módulo: `core`  
> Status: 🟢 CONFIRMADO  
> Rastreabilidade: `backend/apps/core/`

---

## Tarefas Implementadas

- [x] **TK-CORE-01:** Criação da classe base abstrata `TimeStampedModel` com `criado_em` e `atualizado_em`.
- [x] **TK-CORE-02:** Criação do modelo `RegistroSincronizacaoDrive` para auditoria do espelhamento na nuvem.
- [x] **TK-CORE-03:** Submódulo `storage.paths` com cálculo de SHA-256 em streaming e resolução determinística por cliente.
- [x] **TK-CORE-04:** Submódulo `storage.google_drive_service` para autenticação com Service Account, provisionamento hierárquico e permissões `role: reader`.
- [x] **TK-CORE-05:** Submódulo `storage.sync` para despacho assíncrono em background via `transaction.on_commit`.
- [x] **TK-CORE-06:** Comando de contingência `python manage.py sincronizar_storage_drive` para varredura e retentativas em lote.
- [x] **TK-CORE-07:** Conexão dos signals `post_save` e `post_delete` em `AnexoPedido` e `AnexoComentario`.
