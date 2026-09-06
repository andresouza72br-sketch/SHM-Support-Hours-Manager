# Diagrama C4 — Componentes do Backend (Nível 3)

```mermaid
C4Component
    title Diagrama de Componentes do Backend — SHM 2.5.0

    Container_Boundary(backend, "Backend Application (Django REST Framework)")
        Component(auth_ctrl, "Auth & Accounts ViewSet", "DRF Views", "Login tradicional, geração de Magic Login e validação Google OAuth.")
        Component(contrato_svc, "ContratoService", "Service Layer", "Vigência, carência, integridade SHA-256 e auditoria de contratos.")
        Component(pedido_svc, "PedidoService", "Service Layer", "Geração sequencial de protocolo OS e sincronização de status.")
        Component(ciclo_svc, "CicloService", "Service Layer", "Workflow de orçamentos, trava de tolerância (+30%), aceites e Magic Links.")
        Component(saldo_svc, "SaldoService", "Service Layer", "Ledger append-only, locks ordenados, migração de saldo e compensação de débitos.")
        Component(notif_svc, "NotificacaoService", "Service Layer", "Timeline de eventos e despacho multicanal baseado em ConfiguracaoNotificacao.")
        Component(tarefa_svc, "TarefaService", "Service Layer", "Apontamento de horas e recálculo atômico de horas realizadas.")
        Component(forensic_svc, "ForensicAuditService", "Service Layer", "Trilha forense imutável RFC 8785 (JCS), encadeamento de hash SHA-256 e selo diário RN-16.")
        Component(schedule_svc, "GoogleCalendarService & LembreteService", "Service Layer", "Agendamentos com geração de salas Google Meet e escalada de lembretes (24h, 30m, 15m).")
    end

    ContainerDb(db, "PostgreSQL / SQLite", "Tabelas shm_*")

    Rel(auth_ctrl, db, "Autentica e emite tokens")
    Rel(ciclo_svc, pedido_svc, "Notifica mudanças para sincronizar pedido")
    Rel(ciclo_svc, saldo_svc, "Dispara débito de horas reais no aceite")
    Rel(ciclo_svc, notif_svc, "Dispara eventos e alertas de tolerância")
    Rel(saldo_svc, contrato_svc, "Valida e atualiza saldos de contratos com lock")
    Rel(saldo_svc, notif_svc, "Dispara alertas de saldo 80% e saldo esgotado")
    Rel(tarefa_svc, ciclo_svc, "Atualiza horas_realizadas no ciclo")
    Rel(contrato_svc, notif_svc, "Dispara notificações contratuais e convites")
    Rel(schedule_svc, notif_svc, "Dispara lembretes programados e convites de reunião")
    Rel(schedule_svc, forensic_svc, "Registra cancelamentos de reunião na trilha pericial")
    Rel(contrato_svc, forensic_svc, "Registra eventos de auditoria com hash chaining")

    Rel(contrato_svc, db, "Persiste contratos e audit log")
    Rel(saldo_svc, db, "Persiste HistoricoSaldo com select_for_update")
    Rel(forensic_svc, db, "Persiste blocos de auditoria e selos diários")
    Rel(schedule_svc, db, "Persiste agendamentos, participantes e lembretes")
```

