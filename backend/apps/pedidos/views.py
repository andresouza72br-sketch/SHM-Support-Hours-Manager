from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.pedidos.models import Pedido, StatusPedido
from apps.pedidos.serializers import PedidoListSerializer, PedidoDetailSerializer
from apps.pedidos.services import PedidoService

from django.db.models import Case, When, Value, IntegerField

STATUS_ORDER = Case(
    When(status="em_execucao", then=Value(1)),
    When(status="aberto", then=Value(2)),
    When(status="em_orcamento", then=Value(3)),
    When(status="aguardando_aprovacao", then=Value(4)),
    When(status="aguardando_aceite", then=Value(5)),
    When(status="concluido", then=Value(6)),
    When(status="cancelado", then=Value(7)),
    default=Value(8),
    output_field=IntegerField(),
)

PRIORITY_ORDER = Case(
    When(prioridade="urgente", then=Value(1)),
    When(prioridade="alta", then=Value(2)),
    When(prioridade="media", then=Value(3)),
    When(prioridade="baixa", then=Value(4)),
    default=Value(5),
    output_field=IntegerField(),
)

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related("cliente", "contrato", "criado_por").prefetch_related("ciclos", "anexos").all()

    def get_serializer_class(self):
        if self.action in ("retrieve", "create", "update", "partial_update"):
            return PedidoDetailSerializer
        return PedidoListSerializer

    def perform_create(self, serializer):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError
        user = self.request.user
        validated_data = serializer.validated_data
        arquivos = self.request.FILES.getlist("arquivos")
        if not arquivos:
            arquivos = self.request.FILES.getlist("anexos")
        try:
            pedido = PedidoService.criar_pedido(
                contrato=validated_data.get("contrato"),
                assunto=validated_data.get("assunto", ""),
                descricao=validated_data.get("descricao", ""),
                usuario=user,
                prioridade=validated_data.get("prioridade", "media"),
                arquivos=arquivos,
            )
        except DjangoValidationError as e:
            msg = e.messages[0] if hasattr(e, "messages") and e.messages else str(e)
            raise DRFValidationError({"detail": msg})
        serializer.instance = pedido

    @action(detail=True, methods=["post"])
    def adicionar_anexos(self, request, pk=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        pedido = self.get_object()
        arquivos = request.FILES.getlist("arquivos")
        if not arquivos:
            arquivos = request.FILES.getlist("anexos")
        if not arquivos:
            return Response({"detail": "Nenhum arquivo enviado."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            anexos = PedidoService.adicionar_anexos_ao_pedido(pedido, arquivos, request.user)
        except DjangoValidationError as e:
            msg = e.messages[0] if hasattr(e, "messages") and e.messages else str(e)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        from apps.pedidos.serializers import AnexoPedidoSerializer
        return Response(AnexoPedidoSerializer(anexos, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="status_storage")
    def status_storage(self, request, pk=None):
        pedido = self.get_object()
        from apps.pedidos.serializers import AnexoPedidoSerializer
        
        anexos_data = AnexoPedidoSerializer(pedido.anexos.all(), many=True).data
        pasta_url = pedido.cliente.gdrive_folder_url if getattr(pedido, "cliente", None) else None
        
        todos_sincronizados = all(a.get("drive_status") == "sincronizado" for a in anexos_data) if anexos_data else True
        algum_erro = any(a.get("drive_status") == "erro" for a in anexos_data)
        
        status_geral = "sincronizado" if todos_sincronizados else ("erro" if algum_erro else "pendente")
        
        return Response({
            "status_geral": status_geral,
            "pasta_drive_url": pasta_url,
            "total_anexos": len(anexos_data),
            "arquivos": anexos_data,
        })

    @action(detail=True, methods=["post"], url_path="sincronizar_storage")
    def sincronizar_storage(self, request, pk=None):
        pedido = self.get_object()
        from apps.core.storage import _executar_sincronizacao_em_thread, GoogleDriveStorageService
        from apps.core.models import RegistroSincronizacaoDrive
        
        if pedido.cliente:
            service = GoogleDriveStorageService()
            service.obter_ou_criar_pasta_cliente(pedido.cliente)

        for anexo in pedido.anexos.all():
            reg = RegistroSincronizacaoDrive.objects.filter(
                origem_modelo="pedidos.AnexoPedido",
                origem_id=str(anexo.id),
            ).first()
            if reg:
                _executar_sincronizacao_em_thread(str(reg.id))

        return self.status_storage(request, pk)

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        contrato_params = self.request.query_params.getlist("contrato")
        if contrato_params:
            ids = []
            for item in contrato_params:
                for x in str(item).split(","):
                    if x.strip().isdigit():
                        ids.append(int(x.strip()))
            if ids:
                qs = qs.filter(contrato_id__in=ids)
        if user.is_empresa:
            return qs.annotate(
                status_order=STATUS_ORDER,
                priority_order=PRIORITY_ORDER,
            ).order_by("status_order", "priority_order", "-criado_em")
        if user.cliente_id:
            return qs.filter(cliente_id=user.cliente_id).annotate(
                status_order=STATUS_ORDER,
                priority_order=PRIORITY_ORDER,
            ).order_by("status_order", "priority_order", "-criado_em")
        return qs.none()

    @action(detail=False, methods=["get"])
    def kanban(self, request):
        qs = self.get_queryset()
        kanban_data = {
            "aberto": [],
            "em_orcamento": [],
            "aguardando_aprovacao": [],
            "em_execucao": [],
            "aguardando_aceite": [],
            "concluido": [],
        }
        serialized_pedidos = PedidoListSerializer(qs, many=True).data
        for item in serialized_pedidos:
            st = item.get("status")
            if st in kanban_data:
                kanban_data[st].append(item)
        return Response(kanban_data)