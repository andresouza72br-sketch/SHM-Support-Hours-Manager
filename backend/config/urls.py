from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from django.http import JsonResponse
from django.utils import timezone

def status_view(request):
    return JsonResponse({
        "status": "ok",
        "service": "SHM 2.5 Manifest",
        "version": "2.5.0",
        "release": "2.5 Manifest — Support Hours Manager",
        "sessao": "Release 2.5 Manifest — Trava de Tolerância & Regras de Ciclos (Trava de Tolerância orçamentária, Timeline de Auditoria, Avaliação de Ciclos)",
        "regras_envio": "E-mails de aprovação/aceite restritos exclusivamente ao CLIENTE_GERENTE",
        "avisos_empresa": "Gerente e Técnicos avisados na aprovação do orçamento e concessão do aceite",
        "timestamp": timezone.now().isoformat(),
    })

urlpatterns = [
    # Status / Health Check
    path("api/v1/status/", status_view, name="api_status"),

    # Django Admin
    path("admin/", admin.site.urls),
    
    # OpenAPI Schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # API Endpoints
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/clientes/", include("apps.clientes.urls")),
    path("api/v1/contratos/", include("apps.contratos.urls")),
    path("api/v1/pedidos/", include("apps.pedidos.urls")),
    path("api/v1/ciclos/", include("apps.ciclos.urls")),
    path("api/v1/tarefas/", include("apps.tarefas.urls")),
    path("api/v1/saldo/", include("apps.saldo.urls")),
    path("api/v1/comunicacao/", include("apps.comunicacao.urls")),
    path("api/v1/notificacoes/", include("apps.notificacoes.urls")),
    path("api/v1/auditoria/", include("apps.contratos.urls_auditoria")),
    path("api/v1/schedule/", include("apps.schedule.urls")),
    path("api/v1/", include("apps.core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)