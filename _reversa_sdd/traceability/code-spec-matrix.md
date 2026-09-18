# Matriz de Rastreabilidade Código vs Especificação (Code/Spec Matrix) — SHM 2.5.0

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Cobertura do Sistema: 100% dos módulos do legado mapeados

| Arquivo do Legado | Unit Correspondente | Cobertura |
|---|---|---|
| `backend/apps/accounts/models.py` | `accounts/` | 🟢 CONFIRMADO |
| `backend/apps/accounts/views.py` | `accounts/` | 🟢 CONFIRMADO |
| `backend/apps/accounts/serializers.py` | `accounts/` | 🟢 CONFIRMADO |
| `backend/apps/clientes/models.py` | `clientes/` | 🟢 CONFIRMADO |
| `backend/apps/clientes/views.py` | `clientes/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/models.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/views.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/services.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/pedidos/models.py` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/apps/pedidos/views.py` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/apps/pedidos/services.py` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/apps/ciclos/models.py` | `ciclos/` | 🟢 CONFIRMADO |
| `backend/apps/ciclos/views.py` | `ciclos/` | 🟢 CONFIRMADO |
| `backend/apps/ciclos/services.py` | `ciclos/` | 🟢 CONFIRMADO |
| `backend/apps/tarefas/models.py` | `tarefas/` | 🟢 CONFIRMADO |
| `backend/apps/tarefas/views.py` | `tarefas/` | 🟢 CONFIRMADO |
| `backend/apps/saldo/models.py` | `saldo/` | 🟢 CONFIRMADO |
| `backend/apps/saldo/views.py` | `saldo/` | 🟢 CONFIRMADO |
| `backend/apps/saldo/services.py` | `saldo/` | 🟢 CONFIRMADO |
| `backend/apps/comunicacao/models.py` | `comunicacao/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/models.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/views.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/services.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/config_service.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/serializers.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/migrations/0004_configuracaonotificacao_nao_enviar_autor.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `backend/apps/core/models.py` | `core/` | 🟢 CONFIRMADO |
| `backend/tests/test_migracao_saldo.py` | `saldo/` & `contratos/` | 🟢 CONFIRMADO |
| `backend/tests/test_contratos_features.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/tests/test_workflow_e_ciclos.py` | `ciclos/` & `pedidos/` | 🟢 CONFIRMADO |
| `backend/tests/test_configuracoes_notificacoes.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `frontend/src/App.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/types/index.ts` | `frontend/` & `notificacoes/` | 🟢 CONFIRMADO |
| `frontend/src/pages/AdminDashboardPage.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/pages/ConfiguracoesNotificacoesPage.tsx` | `frontend/` & `notificacoes/` | 🟢 CONFIRMADO |
| `frontend/src/pages/ExtratoContratoPage.tsx` | `frontend/` & `saldo/` | 🟢 CONFIRMADO |
| `frontend/src/components/contratos/DocumentosContratoModal.tsx` | `frontend/` & `contratos/` | 🟢 CONFIRMADO |
| `frontend/src/components/contratos/TimelineAuditoriaContrato.tsx` | `frontend/` & `contratos/` | 🟢 CONFIRMADO |
| `frontend/src/api/client.ts` | `frontend/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/forensic_service.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/migrations/0008_forensic_audit_trail_and_trigger.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/tests/test_forensic_hash_chaining.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/tests/test_audit_api_endpoints.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/tests/test_verificador_independente_offline.py` | `contratos/` & `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/pages/DocumentacaoAuditoriaPage.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/components/documentacao/DocumentacaoSidebarTOC.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/components/documentacao/DocumentacaoConteudoGeral.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/components/documentacao/DocumentacaoConteudoPericial.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/utils/verificador_script.ts` | `frontend/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/pdf_service.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/templates/contratos/extrato_oficial.html` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/management/commands/enviar_extratos_mensais.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/tests/test_extrato_pdf.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/core/validators.py` | `core/` | 🟢 CONFIRMADO |
| `backend/apps/core/serializers.py` | `core/` | 🟢 CONFIRMADO |
| `backend/tests/test_branding.py` | `core/` | 🟢 CONFIRMADO |
| `backend/tests/test_storage_hibrido_drive.py` | `core/` | 🟢 CONFIRMADO |
| `frontend/src/pages/ConfiguracoesBrandingPage.tsx` | `frontend/` & `core/` | 🟢 CONFIRMADO |
| `frontend/src/pages/DocumentacaoStoragePage.tsx` | `frontend/` & `core/` | 🟢 CONFIRMADO |
| `frontend/src/components/contratos/EnviarExtratoModal.tsx` | `frontend/` & `contratos/` | 🟢 CONFIRMADO |
| `frontend/src/components/layout/Header.tsx` | `frontend/` & `core/` | 🟢 CONFIRMADO |


