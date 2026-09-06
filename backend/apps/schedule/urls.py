from rest_framework.routers import DefaultRouter
from apps.schedule.views import AgendamentoViewSet, ConfiguracaoScheduleViewSet

router = DefaultRouter()
router.register(r"agendamentos", AgendamentoViewSet, basename="agendamentos")
router.register(r"configuracao", ConfiguracaoScheduleViewSet, basename="configuracao-schedule")

urlpatterns = router.urls

