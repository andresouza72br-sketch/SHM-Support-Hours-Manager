import logging
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import UserRole
from apps.core.utils import get_client_ip, get_client_user_agent
from apps.schedule.models import Agendamento, StatusAgendamento, ConfiguracaoSchedule
from apps.schedule.google_service import GoogleCalendarService
from apps.schedule.serializers import (
    AgendamentoListSerializer,
    AgendamentoDetailSerializer,
    CriarAgendamentoSerializer,
    ConfiguracaoScheduleSerializer,
    AtualizarConfiguracaoScheduleSerializer,
)
from apps.schedule.services import ScheduleService

logger = logging.getLogger(__name__)

class AgendamentoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Agendamento.objects.select_related(
            "cliente", "pedido", "ciclo", "organizador"
        ).prefetch_related("participantes", "lembretes")

        # Isolamento estrito de Multi-Tenant para Clientes
        is_empresa = getattr(user, "is_empresa", False) or user.role in (
            UserRole.EMPRESA_ADMIN,
            UserRole.EMPRESA_TECNICO,
        )
        if not is_empresa:
            if not user.cliente:
                return qs.none()
            qs = qs.filter(cliente=user.cliente)
        else:
            # Filtro opcional por cliente para técnicos/admins
            cliente_id = self.request.query_params.get("cliente")
            if cliente_id:
                qs = qs.filter(cliente_id=cliente_id)

        # Filtros operacionais
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)

        ciclo_id = self.request.query_params.get("ciclo")
        if ciclo_id:
            qs = qs.filter(ciclo_id=ciclo_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        tipo_param = self.request.query_params.get("tipo")
        if tipo_param:
            qs = qs.filter(tipo=tipo_param)

        data_inicio_apos = self.request.query_params.get("data_inicio_apos")
        if data_inicio_apos:
            qs = qs.filter(data_inicio__gte=data_inicio_apos)

        data_inicio_antes = self.request.query_params.get("data_inicio_antes")
        if data_inicio_antes:
            qs = qs.filter(data_inicio__lte=data_inicio_antes)

        return qs.order_by("data_inicio")

    def get_serializer_class(self):
        if self.action in ["retrieve", "cancelar"]:
            return AgendamentoDetailSerializer
        return AgendamentoListSerializer

    def create(self, request, *args, **kwargs):
        serializer = CriarAgendamentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        is_empresa = getattr(user, "is_empresa", False) or user.role in (
            UserRole.EMPRESA_ADMIN,
            UserRole.EMPRESA_TECNICO,
        )

        # Se for cliente, obrigatoriamente vincula ao seu próprio cliente
        if not is_empresa:
            if not user.cliente or data["cliente"] != user.cliente:
                raise PermissionDenied("Você só pode criar agendamentos para a sua própria empresa.")

        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)

        agendamento = ScheduleService.criar_agendamento(
            cliente=data["cliente"],
            organizador=user,
            titulo=data["titulo"],
            data_inicio=data["data_inicio"],
            data_fim=data.get("data_fim"),
            duracao_minutos=data.get("duracao_minutos", 45),
            descricao=data.get("descricao", ""),
            tipo=data.get("tipo"),
            pedido=data.get("pedido"),
            ciclo=data.get("ciclo"),
            tarefa=data.get("tarefa"),
            participantes=data.get("participantes", []),
            sincronizar_google=data.get("sincronizar_google", True),
            google_meet_link=data.get("google_meet_link"),
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        out_serializer = AgendamentoDetailSerializer(agendamento)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        agendamento = self.get_object()
        user = request.user
        is_empresa = getattr(user, "is_empresa", False) or user.role in (
            UserRole.EMPRESA_ADMIN,
            UserRole.EMPRESA_TECNICO,
        )

        # Apenas empresa ou o organizador pode alterar
        if not is_empresa and agendamento.organizador != user:
            raise PermissionDenied("Apenas a equipe de suporte ou o organizador pode alterar este agendamento.")

        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)

        agendamento = ScheduleService.atualizar_agendamento(
            agendamento=agendamento,
            titulo=request.data.get("titulo"),
            descricao=request.data.get("descricao"),
            data_inicio=request.data.get("data_inicio"),
            data_fim=request.data.get("data_fim"),
            duracao_minutos=request.data.get("duracao_minutos"),
            google_meet_link=request.data.get("google_meet_link"),
            autor=user,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        return Response(AgendamentoDetailSerializer(agendamento).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        agendamento = self.get_object()
        motivo = request.data.get("motivo", "")
        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)
        agendamento = ScheduleService.cancelar_agendamento(
            agendamento=agendamento,
            motivo=motivo,
            autor=request.user,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        return Response(AgendamentoDetailSerializer(agendamento).data)

    @action(detail=False, methods=["get"])
    def proxima(self, request):
        now = timezone.now()
        proxima = self.get_queryset().filter(
            status=StatusAgendamento.AGENDADO,
            data_fim__gte=now,
        ).order_by("data_inicio").first()

        if not proxima:
            return Response(None, status=status.HTTP_200_OK)

        return Response(AgendamentoDetailSerializer(proxima).data)


class ConfiguracaoScheduleViewSet(viewsets.ViewSet):
    """
    Endpoints de consulta e configuração do Google Calendar.
    - diagnostico (GET): Disponível para qualquer usuário autenticado (omite e-mail da SA para clientes).
    - diagnostico (PATCH): Restrito a EMPRESA_ADMIN para atualização do calendar_id.
    - testar_conexao (POST): Restrito a EMPRESA_ADMIN para ping na Google API.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get", "patch"], url_path="diagnostico")
    def diagnostico(self, request):
        user = request.user
        is_admin_empresa = bool(
            getattr(user, "is_empresa", False) and getattr(user, "is_empresa_gerente", False)
            or user.role == UserRole.EMPRESA_ADMIN
            or getattr(user, "is_superuser", False)
        )

        config = ConfiguracaoSchedule.get_solo()
        google_service = GoogleCalendarService(calendar_id=config.calendar_id)

        if request.method == "PATCH":
            if not is_admin_empresa:
                raise PermissionDenied("Apenas administradores da empresa podem alterar as configurações do Google Calendar.")

            serializer = AtualizarConfiguracaoScheduleSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            novo_calendar_id = serializer.validated_data["calendar_id"].strip()
            config.calendar_id = novo_calendar_id
            config.atualizado_por = user
            config.save()
            google_service = GoogleCalendarService(calendar_id=config.calendar_id)

        tem_credenciais = google_service._tem_credenciais_configuradas()
        modo_operacao = "ativo" if tem_credenciais else "simulacao"

        sa_email = google_service.obter_service_account_email() if is_admin_empresa else None

        data_resp = {
            "calendar_id": config.calendar_id,
            "modo_operacao": modo_operacao,
            "service_account_configurada": tem_credenciais,
            "service_account_email": sa_email,
            "atualizado_em": config.atualizado_em,
            "atualizado_por_nome": (
                config.atualizado_por.get_full_name() or config.atualizado_por.username
                if config.atualizado_por
                else None
            ),
        }

        serializer_out = ConfiguracaoScheduleSerializer(data_resp)
        return Response(serializer_out.data)

    @action(detail=False, methods=["post"], url_path="testar-conexao")
    def testar_conexao(self, request):
        user = request.user
        is_admin_empresa = bool(
            getattr(user, "is_empresa", False) and getattr(user, "is_empresa_gerente", False)
            or user.role == UserRole.EMPRESA_ADMIN
            or getattr(user, "is_superuser", False)
        )
        if not is_admin_empresa:
            raise PermissionDenied("Apenas administradores da empresa podem executar o teste de comunicação com a Google API.")

        config = ConfiguracaoSchedule.get_solo()
        google_service = GoogleCalendarService(calendar_id=config.calendar_id)
        resultado = google_service.testar_conexao()

        return Response(resultado, status=status.HTTP_200_OK)
