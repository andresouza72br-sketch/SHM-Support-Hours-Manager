import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import (
    Cliente,
    StatusCliente,
    ClienteAceiteLink,
    ClienteAuditLog,
    TipoEventoClienteAudit,
)
from apps.clientes.serializers import (
    ClienteSerializer,
    ClienteUserSerializer,
    ClienteUserCreateSerializer,
    ClienteUserUpdateSerializer,
    ClienteAprovacaoDetailSerializer,
)
from apps.accounts.models import User, UserRole, PasswordlessLoginToken
from apps.clientes.email_service import ClienteUsuarioEmailService
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser, IsClienteGerente
from apps.core.utils import get_client_ip, get_client_user_agent
from apps.notificacoes.models import Notification

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.prefetch_related("contratos", "usuarios", "aceite_links").all()
    serializer_class = ClienteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "excluir", "reenviar_aprovacao"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        cliente = self.get_object()
        return self._executar_exclusao_cliente(request, cliente)

    @action(detail=True, methods=["delete", "post"], permission_classes=[IsEmpresaAdmin], url_path="excluir")
    def excluir(self, request, pk=None):
        cliente = self.get_object()
        return self._executar_exclusao_cliente(request, cliente)

    @action(detail=True, methods=["post"], url_path="sincronizar_drive")
    def sincronizar_drive(self, request, pk=None):
        cliente = self.get_object()
        from apps.core.storage import GoogleDriveStorageService
        service = GoogleDriveStorageService()
        service.obter_ou_criar_pasta_cliente(cliente)
        return Response({
            "sucesso": True,
            "gdrive_folder_id": cliente.gdrive_folder_id,
            "gdrive_folder_url": cliente.gdrive_folder_url,
            "email_compartilhado": cliente.email_google_drive or cliente.email_contato,
            "mensagem": "Pasta corporativa do cliente criada e compartilhada com sucesso no Google Drive.",
        }, status=status.HTTP_200_OK)

    def _executar_exclusao_cliente(self, request, cliente):
        from apps.clientes.services import ClienteService

        justificativa = ""
        if isinstance(request.data, dict):
            justificativa = request.data.get("justificativa") or ""
        if not justificativa:
            justificativa = request.query_params.get("justificativa") or ""

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        nome_cliente, justificativa_limpa = ClienteService.excluir_cliente(
            cliente=cliente,
            justificativa=justificativa,
            usuario=request.user,
            ip=ip,
            user_agent=ua,
        )

        return Response({
            "detail": f"Cliente '{nome_cliente}' excluído com sucesso e registrado na auditoria forense.",
            "cliente_nome": nome_cliente,
            "justificativa": justificativa_limpa,
        }, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        cliente = serializer.save()

        # Criação de link seguro de aprovação e validação com validade de 7 dias
        aceite_link = ClienteAceiteLink.objects.create(
            cliente=cliente,
            data_expiracao=timezone.now() + timedelta(days=7),
        )

        # Envio automático do Magic Link por e-mail para o gestor responsável
        ClienteUsuarioEmailService.enviar_email_aprovacao_cliente(
            cliente=cliente,
            aceite_link=aceite_link,
            request=self.request,
        )

        return cliente

    def get_queryset(self):
        user = self.request.user
        if user.is_empresa:
            return Cliente.objects.prefetch_related("contratos", "usuarios", "aceite_links").all()
        if user.cliente_id:
            return Cliente.objects.filter(id=user.cliente_id).prefetch_related("contratos", "usuarios", "aceite_links")
        return Cliente.objects.none()

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin], url_path="reenviar_aprovacao")
    def reenviar_aprovacao(self, request, pk=None):
        from apps.clientes.services import ClienteService

        cliente = self.get_object()
        aceite_link, email_enviado = ClienteService.reenviar_aprovacao_cliente(cliente=cliente, request=request)

        if not email_enviado:
            raise ValidationError({
                "detail": f"Não foi possível enviar o e-mail de aprovação para '{cliente.email_contato}'. Verifique o endereço digitado."
            })

        data_expira = aceite_link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
        return Response({
            "detail": f"Magic link de aprovação e validação de e-mail (validade de 7 dias até {data_expira}) enviado com sucesso para '{cliente.email_contato}'!",
            "token": str(aceite_link.token),
            "expira_em": aceite_link.data_expiracao.isoformat(),
            "email_enviado": email_enviado,
        })


    def _check_cliente_gerente_access(self, request, cliente: Cliente):
        """Verifica se o usuário é Administrador da Empresa ou Gerente do próprio cliente."""
        if request.user.is_empresa or request.user.is_superuser:
            return True
        if request.user.role == UserRole.CLIENTE_GERENTE and request.user.cliente_id == cliente.id:
            return True
        raise PermissionDenied("Apenas administradores ou o gerente da própria empresa possuem acesso a esta ação.")

    @action(detail=True, methods=["post", "patch"], parser_classes=[MultiPartParser, FormParser, JSONParser], url_path="atualizar_perfil")
    def atualizar_perfil(self, request, pk=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        # Atualização de campos de contato e perfil
        campos_texto = [
            "nome_fantasia", "email_contato", "telefone", "celular_whatsapp",
            "pessoa_contato", "cargo_contato", "site_url", "cep", "logradouro",
            "numero", "complemento", "bairro", "cidade", "estado", "cor_primaria_hex"
        ]
        for campo in campos_texto:
            if campo in request.data:
                setattr(cliente, campo, request.data.get(campo))

        if "emails_notificacao_padrao" in request.data:
            emails = request.data.get("emails_notificacao_padrao")
            if isinstance(emails, list):
                cliente.emails_notificacao_padrao = emails

        # Upload de logo
        if "logo" in request.FILES:
            logo_file = request.FILES["logo"]
            if logo_file.size > 5 * 1024 * 1024:
                raise ValidationError({"logo": "A imagem da logo não pode exceder 5MB."})
            cliente.logo = logo_file

        cliente.save()
        serializer = self.get_serializer(cliente)
        return Response({
            "detail": "Informações da empresa atualizadas com sucesso!",
            "cliente": serializer.data,
        })

    # =========================================================================
    # GESTÃO DE USUÁRIOS VINCULADOS AO CLIENTE (RBAC / CONVITES)
    # =========================================================================
    @action(detail=True, methods=["get", "post"], url_path="usuarios")
    def usuarios(self, request, pk=None):
        cliente = self.get_object()

        # GET: Listar usuários do cliente
        if request.method == "GET":
            # Usuários do mesmo cliente ou equipe da empresa
            if not (request.user.is_empresa or request.user.cliente_id == cliente.id):
                raise PermissionDenied("Você não tem permissão para visualizar os usuários deste cliente.")
            
            usuarios_qs = User.objects.filter(cliente=cliente).order_by("-is_active", "first_name", "username")
            serializer = ClienteUserSerializer(usuarios_qs, many=True)
            return Response(serializer.data)

        # POST: Cadastrar novo colaborador do cliente e disparar convite
        from apps.clientes.services import ClienteService

        self._check_cliente_gerente_access(request, cliente)
        create_serializer = ClienteUserCreateSerializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)

        data = create_serializer.validated_data
        role = data.get("role", UserRole.CLIENTE_ANALISTA)

        # Anti-privilege escalation
        if not request.user.is_empresa and role not in (UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA):
            raise PermissionDenied("Você só pode criar usuários com perfil de Gerente ou Analista.")

        novo_user, token_obj, email_enviado = ClienteService.criar_colaborador_com_convite(
            cliente=cliente,
            dados=data,
            convidador=request.user,
        )

        user_serializer = ClienteUserSerializer(novo_user)
        return Response({
            "detail": f"Usuário '{novo_user.email}' cadastrado com sucesso! Convite de acesso disparado por e-mail.",
            "user": user_serializer.data,
            "token": str(token_obj.token) if settings.DEBUG else None,
            "email_enviado": email_enviado,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"usuarios/(?P<user_id>[^/.]+)")
    def usuario_detail(self, request, pk=None, user_id=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        target_user = User.objects.filter(id=user_id, cliente=cliente).first()
        if not target_user:
            raise ValidationError({"detail": "Usuário não encontrado neste cliente."})

        if request.method == "DELETE":
            if target_user.id == request.user.id:
                raise ValidationError({"detail": "Você não pode desativar ou remover sua própria conta."})
            target_user.is_active = False
            target_user.save(update_fields=["is_active"])
            return Response({"detail": f"Acesso do usuário '{target_user.email}' desativado com sucesso."})

        # PATCH: Atualizar dados e perfil do usuário
        update_serializer = ClienteUserUpdateSerializer(target_user, data=request.data, partial=True)
        update_serializer.is_valid(raise_exception=True)

        new_role = update_serializer.validated_data.get("role")
        if new_role and not request.user.is_empresa and new_role not in (UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA):
            raise PermissionDenied("Você não pode atribuir papéis de administração da empresa contratada.")

        new_is_active = update_serializer.validated_data.get("is_active")
        if new_is_active is False and target_user.id == request.user.id:
            raise ValidationError({"is_active": "Você não pode desativar o seu próprio usuário."})

        usuario_salvo = update_serializer.save()
        return Response({
            "detail": f"Usuário '{usuario_salvo.email}' atualizado com sucesso!",
            "user": ClienteUserSerializer(usuario_salvo).data,
        })

    @action(detail=True, methods=["post"], url_path=r"usuarios/(?P<user_id>[^/.]+)/reenviar_convite")
    def reenviar_convite(self, request, pk=None, user_id=None):
        from apps.clientes.services import ClienteService

        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        target_user = User.objects.filter(id=user_id, cliente=cliente).first()
        if not target_user:
            raise ValidationError({"detail": "Usuário não encontrado neste cliente."})

        token_obj, email_enviado = ClienteService.reenviar_convite_usuario(
            target_user=target_user,
            convidador=request.user,
        )

        return Response({
            "detail": f"Novo link de acesso de 48 horas reenviado para '{target_user.email}'!",
            "token": str(token_obj.token) if settings.DEBUG else None,
            "email_enviado": email_enviado,
        })

    @action(detail=True, methods=["post"], url_path=r"usuarios/(?P<user_id>[^/.]+)/alternar_status")
    def alternar_status(self, request, pk=None, user_id=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        target_user = User.objects.filter(id=user_id, cliente=cliente).first()
        if not target_user:
            raise ValidationError({"detail": "Usuário não encontrado neste cliente."})

        if target_user.id == request.user.id:
            raise ValidationError({"detail": "Você não pode alternar o status do seu próprio usuário."})

        target_user.is_active = not target_user.is_active
        target_user.save(update_fields=["is_active"])

        status_str = "ativado" if target_user.is_active else "bloqueado / desativado"
        return Response({
            "detail": f"Usuário '{target_user.email}' {status_str} com sucesso!",
            "is_active": target_user.is_active,
            "user": ClienteUserSerializer(target_user).data,
        })


class AceiteClienteView(APIView):
    """
    Endpoint público para consulta, revisão e formalização de aprovação de cadastro
    e verificação automática de e-mail do gestor com Magic Link (validade de 7 dias).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        link = ClienteAceiteLink.objects.select_related("cliente").filter(token=token).first()
        if not link:
            return Response(
                {"detail": "Link de aprovação não encontrado ou inválido."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cliente = link.cliente
        expirado = timezone.now() > link.data_expiracao
        serializer = ClienteAprovacaoDetailSerializer(cliente, context={"request": request})

        return Response({
            "cliente": serializer.data,
            "expirado": expirado,
            "expira_em": link.data_expiracao.isoformat(),
            "usado": link.usado,
            "usado_em": link.usado_em.isoformat() if link.usado_em else None,
            "email_verificado": cliente.email_verificado,
        })

    def post(self, request, token):
        from apps.core.utils import get_client_ip, get_client_user_agent
        from apps.clientes.services import ClienteService

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        cliente, link, status_code, msg = ClienteService.formalizar_aceite(
            token=token,
            ip=ip,
            user_agent=ua,
        )

        if status_code != 200:
            return Response({"detail": msg}, status=status_code)

        serializer = ClienteAprovacaoDetailSerializer(cliente, context={"request": request})
        return Response({
            "detail": msg,
            "cliente": serializer.data,
            "data_aprovacao": cliente.aprovado_em.isoformat(),
            "email_verificado": True,
            "ip_origem": ip,
        }, status=status.HTTP_200_OK)