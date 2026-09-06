from django.urls import path
from apps.contratos.views import (
    PainelIntegridadeAuditoriaView,
    AuditDailySealListView,
    ExecutarAuditoriaDiariaView,
)

urlpatterns = [
    path("painel_integridade/", PainelIntegridadeAuditoriaView.as_view(), name="auditoria_painel_integridade"),
    path("selos_diarios/", AuditDailySealListView.as_view(), name="auditoria_selos_diarios"),
    path("executar_diaria/", ExecutarAuditoriaDiariaView.as_view(), name="auditoria_executar_diaria"),
]
