import os
import time
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    TipoDocumentoContrato,
    ForensicAuditLog,
    AuditDailySeal,
)
from apps.contratos.serializers import (
    ContratoSerializer,
    ContratoDocumentoSerializer,
    ContratoAuditLogSerializer,
    ForensicAuditLogSerializer,
    AuditDailySealSerializer,
)
from apps.contratos.services import ContratoService, ContratoDocumentoService
from apps.contratos.forensic_service import ForensicAuditService
from apps.accounts.models import UserRole
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser, IsClienteGerente
from apps.core.utils import get_client_ip, get_client_user_agent, calcular_hash_sha256

def _is_gerente_do_contrato(user, contrato) -> bool:
    """
    Retorna True se o usuário autenticado é o gerente responsável cadastrado
    no contrato (role CLIENTE_GERENTE + email == gestor_email do contrato,
    ou caso gestor_email não esteja especificado, qualquer CLIENTE_GERENTE vinculado ao cliente),
    pertencendo ao mesmo cliente vinculado.
    Superusuários e staff sempre passam.
    """
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    if getattr(user, "role", None) != "CLIENTE_GERENTE" or getattr(user, "cliente_id", None) != contrato.cliente_id:
        return False
    if not contrato.gestor_email:
        return True
    return bool(user.email and user.email.strip().lower() == contrato.gestor_email.strip().lower())


class ContratoViewSet(viewsets.ModelViewSet):
    queryset = (
        Contrato.objects.select_related("cliente", "criado_por", "cancelado_por", "concluido_por")
        .prefetch_related("documentos", "pdfs", "auditoria")
        .all()
    )
    serializer_class = ContratoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "cancelar", "concluir", "upload_documento", "deletar_documento"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        contrato = ContratoService.criar_contrato(self.request.data, self.request.user, request=self.request)
        serializer.instance = contrato
        return contrato

    def perform_update(self, serializer):
        contrato_antigo = self.get_object()
        if contrato_antigo.status in [StatusContrato.CONCLUIDO, StatusContrato.CANCELADO]:
            raise ValidationError(
                {"detail": f"Contratos com status '{contrato_antigo.get_status_display()}' estão encerrados e não permitem edição cadastral para preservar a integridade histórica e jurídica."}
            )
        contrato = serializer.save()

        # Log audit of modifications
        ip = get_client_ip(self.request)
        ua = get_client_user_agent(self.request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Dados cadastrais do contrato {contrato.numero} alterados por {self.request.user.get_full_name() or self.request.user.username} ({self.request.user.get_role_display()}).",
            usuario=self.request.user,
            ip_origem=ip,
            user_agent=ua,
        )

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Contratos não podem ser excluídos do sistema. Utilize o cancelamento com justificativa obrigatória para manter o histórico auditável."}
        )

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_empresa:
            return qs
        if user.cliente_id:
            return qs.filter(cliente_id=user.cliente_id)
        return qs.none()

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def cancelar(self, request, pk=None):
        contrato = self.get_object()
        justificativa = (request.data.get("justificativa") or "").strip()

        if not justificativa or len(justificativa) < 5:
            raise ValidationError({"justificativa": "A justificativa de cancelamento é obrigatória e deve conter pelo menos 5 caracteres."})

        if contrato.status == StatusContrato.CANCELADO:
            return Response({"detail": "Este contrato já se encontra cancelado."}, status=status.HTTP_400_BAD_REQUEST)

        contrato.status = StatusContrato.CANCELADO
        contrato.justificativa_cancelamento = justificativa
        contrato.cancelado_por = request.user
        contrato.cancelado_em = timezone.now()
        contrato.save(update_fields=["status", "justificativa_cancelamento", "cancelado_por", "cancelado_em", "atualizado_em"])

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CANCELAMENTO,
            descricao=f"Contrato {contrato.numero} cancelado por {request.user.get_full_name() or request.user.username}.",
            justificativa=justificativa,
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = self.get_serializer(contrato)
        return Response({
            "detail": f"Contrato {contrato.numero} cancelado com sucesso!",
            "contrato": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def concluir(self, request, pk=None):
        contrato = self.get_object()

        if contrato.status == StatusContrato.CONCLUIDO:
            return Response({"detail": "Este contrato já se encontra concluído."}, status=status.HTTP_400_BAD_REQUEST)

        contrato.status = StatusContrato.CONCLUIDO
        contrato.concluido_por = request.user
        contrato.concluido_em = timezone.now()
        contrato.save(update_fields=["status", "concluido_por", "concluido_em", "atualizado_em"])

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CONCLUSAO,
            descricao=f"Contrato {contrato.numero} marcado como Concluído por {request.user.get_full_name() or request.user.username}.",
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = self.get_serializer(contrato)
        return Response({
            "detail": f"Contrato {contrato.numero} marcado como concluído com sucesso!",
            "contrato": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin], parser_classes=[MultiPartParser, FormParser])
    def upload_documento(self, request, pk=None):
        contrato = self.get_object()
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        doc = ContratoDocumentoService.adicionar_documento(
            contrato=contrato,
            arquivo=request.FILES.get("arquivo"),
            tipo_doc=request.data.get("tipo_documento", TipoDocumentoContrato.OUTRO),
            usuario=request.user,
            ip=ip,
            ua=ua,
        )
        serializer = ContratoDocumentoSerializer(doc, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete", "post"], permission_classes=[IsEmpresaAdmin], url_path="documentos/(?P<doc_id>[^/.]+)")
    def deletar_documento(self, request, pk=None, doc_id=None):
        if not (getattr(request.user, "role", None) == UserRole.EMPRESA_ADMIN or getattr(request.user, "is_superuser", False)):
            raise PermissionDenied("Somente o Gerente da Empresa possui permissão para remover documentos anexos aos contratos.")

        contrato = self.get_object()
        doc = ContratoDocumento.objects.filter(contrato=contrato, id=doc_id).first()
        if not doc:
            raise Http404("Documento não encontrado neste contrato.")

        justificativa = (
            request.data.get("justificativa")
            or request.data.get("motivo")
            or request.query_params.get("justificativa")
            or request.query_params.get("motivo")
            or ""
        ).strip()
        if not justificativa or len(justificativa) < 5:
            raise ValidationError({
                "justificativa": "A justificativa para remoção do documento é obrigatória e deve conter pelo menos 5 caracteres.",
                "motivo": "O motivo da remoção é obrigatório para fins de auditoria forense.",
            })

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        res = ContratoDocumentoService.excluir_documento(doc, justificativa, request.user, ip, ua)

        return Response({
            "detail": f"Documento '{res['nome']}' removido com sucesso e auditado no log forense.",
            "documento_nome": res["nome"],
            "documento_hash": res["hash"],
            "hash_sha256": res["hash"],
            "justificativa": justificativa,
            "motivo": justificativa,
        })

    @action(detail=True, methods=["get"], url_path="documentos/(?P<doc_id>[^/.]+)/download")
    def download_documento(self, request, pk=None, doc_id=None):
        contrato = self.get_object()

        # Empresa sempre pode; cliente só se for o gerente cadastrado no contrato
        if not request.user.is_empresa:
            if not _is_gerente_do_contrato(request.user, contrato):
                raise PermissionDenied(
                    "Somente o Gerente responsável cadastrado neste contrato pode baixar documentos."
                )

        doc = ContratoDocumento.objects.filter(contrato=contrato, id=doc_id).first()
        if not doc:
            raise Http404("Documento não encontrado.")

        # REGISTRO DE AUDITORIA FORENSE DE DOWNLOAD
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        usuario_str = request.user.get_full_name() or request.user.username
        role_str = request.user.get_role_display()

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.DOWNLOAD_DOCUMENTO,
            descricao=f"Download do documento '{doc.nome_original}' ({doc.get_tipo_documento_display()}) efetuado por {usuario_str} ({role_str}).",
            documento_nome=doc.nome_original,
            documento_hash=doc.hash_sha256,
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        try:
            return FileResponse(doc.arquivo.open("rb"), as_attachment=True, filename=doc.nome_original)
        except Exception:
            return Response({"url": request.build_absolute_uri(doc.arquivo.url)})

    @action(detail=True, methods=["get", "post"], url_path="documentos/(?P<doc_id>[^/.]+)/verificar")
    def verificar_documento(self, request, pk=None, doc_id=None):
        contrato = self.get_object()

        # Permissão: Empresa OU Gerente cadastrado no contrato
        if not request.user.is_empresa:
            if not _is_gerente_do_contrato(request.user, contrato):
                raise PermissionDenied(
                    "Somente a Empresa ou o Gerente responsável cadastrado neste contrato podem verificar a integridade de documentos."
                )

        doc = ContratoDocumento.objects.filter(contrato=contrato, id=doc_id).first()
        if not doc:
            raise Http404("Documento não encontrado.")

        resultado = ContratoDocumentoService.verificar_integridade(doc)
        return Response(resultado["payload"], status=resultado["status_code"])

    @action(detail=True, methods=["patch", "post"], url_path="atualizar_emails")
    def atualizar_emails(self, request, pk=None):
        contrato = self.get_object()

        # Permissão: Empresa Admin OU Gerente cadastrado no contrato (gestor_email)
        if not (request.user.is_empresa or _is_gerente_do_contrato(request.user, contrato)):
            raise PermissionDenied(
                "Apenas o Administrador da Empresa ou o Gerente responsável cadastrado neste contrato podem gerenciar e-mails de notificação."
            )

        emails = request.data.get("emails_notificacao")
        if emails is None:
            raise ValidationError({"emails_notificacao": "Campo obrigatório."})

        if not isinstance(emails, list):
            raise ValidationError({"emails_notificacao": "Deve ser uma lista de e-mails de notificação."})

        contrato.emails_notificacao = emails
        contrato.save(update_fields=["emails_notificacao", "atualizado_em"])

        # Sincronizar destinatários relacionais e disparar convites de 15 dias
        from apps.contratos.email_service import ContratoEmailNotificacaoService
        ContratoEmailNotificacaoService.sincronizar_destinatarios_contrato(
            contrato=contrato,
            lista_emails=emails,
            usuario_solicitante=request.user,
            request=request,
        )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        usuario_str = request.user.get_full_name() or request.user.username
        role_str = request.user.get_role_display()
        total_ativos = sum(1 for e in emails if isinstance(e, dict) and e.get("ativo"))

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ATUALIZACAO_EMAILS,
            descricao=f"Lista de e-mails de notificação atualizada por {usuario_str} ({role_str}). Total cadastrado: {len(emails)} ({total_ativos} ativos).",
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = self.get_serializer(contrato)
        return Response({
            "detail": "Lista de e-mails de notificação atualizada com sucesso!",
            "emails_notificacao": contrato.emails_notificacao,
            "contrato": serializer.data,
        })

    @action(detail=True, methods=["post"], url_path="reenviar_convite_email")
    def reenviar_convite_email(self, request, pk=None):
        contrato = self.get_object()

        # Permissão: Empresa Admin OU Gerente cadastrado no contrato (gestor_email)
        if not (request.user.is_empresa or _is_gerente_do_contrato(request.user, contrato)):
            raise PermissionDenied("Sem permissão para reenviar convites de e-mail deste contrato.")

        email_alvo = request.data.get("email")
        destinatario_id = request.data.get("destinatario_id")

        dest = None
        if destinatario_id:
            dest = contrato.destinatarios_notificacao.filter(id=destinatario_id).first()
        elif email_alvo:
            dest = contrato.destinatarios_notificacao.filter(email__iexact=str(email_alvo).strip()).first()

        if not dest:
            raise ValidationError({"detail": "Destinatário de e-mail não encontrado neste contrato."})

        # Renovar token e validade de 15 dias
        import uuid
        dest.token = uuid.uuid4()
        dest.expira_em = timezone.now() + timedelta(days=15)
        dest.status = "pendente"
        dest.convidado_por = request.user
        dest.save()

        from apps.contratos.email_service import ContratoEmailNotificacaoService
        sucesso = ContratoEmailNotificacaoService.enviar_convite_confirmacao_email(dest, request)

        if not sucesso:
            return Response({"detail": "Falha ao enviar e-mail de confirmação. Verifique o endereço digitado."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = ContratoEmailNotificacaoSerializer(dest)
        return Response({
            "detail": f"Convite de confirmação com validade de 15 dias reenviado para '{dest.email}' com sucesso!",
            "destinatario": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin], url_path="reenviar_aceite")
    def reenviar_aceite(self, request, pk=None):
        contrato = self.get_object()

        from apps.contratos.models import AceiteLink
        from datetime import timedelta

        # Obter link existente não expirado ou criar novo/renovar
        link = contrato.aceite_links.filter(usado=False, data_expiracao__gt=timezone.now()).order_by("-criado_em").first()
        if not link:
            link = AceiteLink.objects.create(
                contrato=contrato,
                data_expiracao=timezone.now() + timedelta(days=30),
            )

        from apps.contratos.email_service import ContratoEmailNotificacaoService
        sucesso = ContratoEmailNotificacaoService.enviar_email_aceite_contrato(contrato, link, request=request)

        if not sucesso:
            raise ValidationError({"detail": "Não foi possível enviar o e-mail de aceite. Verifique se o e-mail do gestor ou do cliente está devidamente preenchido."})

        return Response({
            "detail": f"E-mail de solicitação de aceite e início dos trabalhos reenviado com sucesso para o responsável pelo contrato {contrato.numero}!",
            "token": str(link.token),
            "expira_em": link.data_expiracao.isoformat(),
        })

    @action(detail=True, methods=["post"], url_path="auditar_relatorio")
    def auditar_relatorio(self, request, pk=None):
        contrato = self.get_object()

        # Empresa sempre pode; cliente só se for o gerente cadastrado no contrato
        if not request.user.is_empresa:
            if not _is_gerente_do_contrato(request.user, contrato):
                raise PermissionDenied(
                    "Somente o Gerente responsável cadastrado neste contrato pode emitir o relatório."
                )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        usuario_str = request.user.get_full_name() or request.user.username
        role_str = request.user.get_role_display()

        log = ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.DOWNLOAD_RELATORIO,
            descricao=f"Download / Impressão do Relatório Oficial do Contrato {contrato.numero} efetuada por {usuario_str} ({role_str}).",
            documento_nome=f"Extrato-{contrato.numero}.pdf",
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        return Response({
            "detail": f"Auditoria do download/impressão do relatório do contrato {contrato.numero} registrada com sucesso!",
            "log_id": log.id,
            "timestamp": log.timestamp.isoformat(),
        })

    @action(detail=True, methods=["get"])
    def auditoria(self, request, pk=None):
        contrato = self.get_object()
        logs = contrato.auditoria.select_related("usuario").order_by("-timestamp")
        serializer = ContratoAuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def trilha_forense(self, request, pk=None):
        contrato = self.get_object()
        particao = f"contrato:{contrato.id}"
        qs = ForensicAuditLog.objects.filter(particao=particao).order_by("-sequencia")

        nivel = request.query_params.get("nivel")
        if nivel:
            qs = qs.filter(nivel_relevancia=nivel.upper())

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ForensicAuditLogSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ForensicAuditLogSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def verificar_integridade(self, request, pk=None):
        contrato = self.get_object()
        particao = f"contrato:{contrato.id}"
        resultado = ForensicAuditService.verificar_integridade_particao(particao)
        resultado["contrato_numero"] = contrato.numero
        status_code = status.HTTP_200_OK if resultado.get("status") == "integro" else status.HTTP_409_CONFLICT
        return Response(resultado, status=status_code)


    @action(detail=True, methods=["get"])
    def extrato(self, request, pk=None):
        contrato = self.get_object()
        serializer = self.get_serializer(contrato)

        auditoria_completa = ContratoAuditLogSerializer(
            contrato.auditoria.select_related("usuario").order_by("-timestamp"),
            many=True,
        ).data

        extrato_dados = ContratoService.obter_dados_extrato(contrato)

        return Response({
            "contrato": serializer.data,
            "historico_ciclos": extrato_dados["historico_ciclos"],
            "auditoria": auditoria_completa,
            "conciliacao": extrato_dados["conciliacao"],
        })

class AceiteContratoView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        from django.utils import timezone
        from apps.contratos.models import AceiteLink

        link = AceiteLink.objects.select_related("contrato__cliente", "contrato__criado_por").filter(token=token).first()
        if not link:
            return Response({"detail": "Token de aceite não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        contrato = link.contrato
        expirado = timezone.now() > link.data_expiracao
        serializer = ContratoSerializer(contrato, context={"request": request})

        cliente = contrato.cliente
        cliente_nome = cliente.display_name if cliente else "Cliente"
        cliente_cnpj_cpf = cliente.cnpj or cliente.cpf if cliente else ""

        return Response({
            "contrato": serializer.data,
            "cliente_nome": cliente_nome,
            "cliente_cnpj_cpf": cliente_cnpj_cpf,
            "expirado": expirado,
            "expira_em": link.data_expiracao.isoformat(),
            "usado": link.usado,
            "usado_em": link.usado_em.isoformat() if link.usado_em else None,
        })

    def post(self, request, token):
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        resultado = ContratoService.formalizar_aceite(token=token, ip=ip, ua=ua, request=request)
        if not resultado["sucesso"]:
            if resultado["codigo"] == "token_invalido":
                return Response({"detail": resultado["mensagem"]}, status=status.HTTP_404_NOT_FOUND)
            elif resultado["codigo"] == "ja_usado":
                return Response({"detail": resultado["mensagem"]}, status=status.HTTP_409_CONFLICT)
            elif resultado["codigo"] == "expirado":
                return Response({"detail": resultado["mensagem"]}, status=status.HTTP_410_GONE)
            return Response({"detail": resultado["mensagem"]}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "detail": f"Aceite do Contrato {resultado['contrato_numero']} formalizado com sucesso! Os trabalhos técnicos e o uso do sistema estão autorizados.",
            "contrato_numero": resultado["contrato_numero"],
            "cliente_nome": resultado["cliente_nome"],
            "data_aceite": resultado["data_aceite"],
            "ip_origem": resultado["ip_origem"],
        })


class ConfirmarEmailNotificacaoView(APIView):
    """
    Endpoint público acessível via Magic Link com validade de 15 dias para confirmação de e-mail de notificação.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        from apps.contratos.models import ContratoEmailNotificacao

        dest = (
            ContratoEmailNotificacao.objects.select_related("contrato", "contrato__cliente", "convidado_por")
            .filter(token=token)
            .first()
        )
        if not dest:
            return Response(
                {"detail": "Token de confirmação não encontrado ou link inválido."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contrato = dest.contrato
        cliente = contrato.cliente
        convidador = dest.convidado_por
        convidador_nome = (convidador.get_full_name() or convidador.username) if convidador else "Gestor do Sistema"
        convidador_papel = convidador.get_role_display() if convidador else "Administrador"

        return Response({
            "token": str(dest.token),
            "email": dest.email,
            "nome": dest.nome,
            "contrato_id": contrato.id,
            "contrato_numero": contrato.numero,
            "cliente_nome": cliente.display_name if cliente else "Cliente",
            "cliente_logo": cliente.logo_url if cliente and hasattr(cliente, "logo_url") else None,
            "convidado_por_nome": convidador_nome,
            "convidado_por_papel": convidador_papel,
            "status": dest.status_calculado,
            "status_display": dest.get_status_display(),
            "ativo": dest.ativo,
            "is_expirado": dest.is_expirado,
            "dias_restantes": dest.dias_restantes,
            "expira_em": dest.expira_em.isoformat() if dest.expira_em else None,
            "confirmado_em": dest.confirmado_em.isoformat() if dest.confirmado_em else None,
        })

    def post(self, request, token):
        from apps.contratos.email_service import ContratoEmailNotificacaoService

        resultado = ContratoEmailNotificacaoService.processar_confirmacao(token, request)
        if not resultado["sucesso"]:
            status_code = status.HTTP_410_GONE if resultado["codigo"] == "token_expirado" else status.HTTP_404_NOT_FOUND
            return Response({"detail": resultado["mensagem"], "codigo": resultado["codigo"]}, status=status_code)

        dest = resultado["destinatario"]
        return Response({
            "detail": resultado["mensagem"],
            "codigo": resultado["codigo"],
            "email": dest.email,
            "contrato_numero": dest.contrato.numero,
            "confirmado_em": dest.confirmado_em.isoformat(),
        })


class RecusarEmailNotificacaoView(APIView):
    """
    Endpoint público para recusar recebimento de notificações.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        from apps.contratos.email_service import ContratoEmailNotificacaoService

        resultado = ContratoEmailNotificacaoService.processar_recusa(token, request)
        if not resultado["sucesso"]:
            return Response({"detail": resultado["mensagem"], "codigo": resultado["codigo"]}, status=status.HTTP_404_NOT_FOUND)

        dest = resultado["destinatario"]
        return Response({
            "detail": resultado["mensagem"],
            "codigo": resultado["codigo"],
            "email": dest.email,
            "contrato_numero": dest.contrato.numero,
        })


class PainelIntegridadeAuditoriaView(APIView):
    """
    Endpoint consolidado pericial para auditoria e governança (RN-16).
    Exclusivo para administradores da empresa.
    """
    permission_classes = [permissions.IsAuthenticated, IsEmpresaAdmin]

    def get(self, request):
        particoes = list(ForensicAuditLog.objects.values_list("particao", flat=True).distinct())
        total_particoes = len(particoes)
        particoes_integras = 0
        particoes_rompidas = 0

        for part in particoes:
            res = ForensicAuditService.verificar_integridade_particao(part)
            if res.get("status") == "integro":
                particoes_integras += 1
            else:
                particoes_rompidas += 1

        total_eventos_auditados = ForensicAuditLog.objects.count()

        ultimo_selo = AuditDailySeal.objects.order_by("-selado_em", "-data_referencia").first()
        ultimo_selo_diario = None
        if ultimo_selo:
            ultimo_selo_diario = {
                "data_referencia": ultimo_selo.data_referencia.isoformat(),
                "selado_em": ultimo_selo.selado_em.isoformat(),
                "selo_digest": ultimo_selo.selo_digest,
            }

        return Response({
            "total_particoes": total_particoes,
            "particoes_integras": particoes_integras,
            "particoes_rompidas": particoes_rompidas,
            "total_eventos_auditados": total_eventos_auditados,
            "ultimo_selo_diario": ultimo_selo_diario,
        })


class AuditDailySealListView(APIView):
    """
    Lista o histórico pericial de selos diários de auditoria (RN-16).
    Exclusivo para administradores da empresa.
    """
    permission_classes = [permissions.IsAuthenticated, IsEmpresaAdmin]

    def get(self, request):
        particao = request.query_params.get("particao")
        limite = request.query_params.get("limite")

        qs = AuditDailySeal.objects.all().order_by("-data_referencia", "-selado_em")
        if particao:
            qs = qs.filter(particao__icontains=particao)

        if limite and limite.isdigit():
            qs = qs[:int(limite)]
        else:
            qs = qs[:100]  # Padrão: até 100 selos mais recentes

        serializer = AuditDailySealSerializer(qs, many=True)
        return Response(serializer.data)


class ExecutarAuditoriaDiariaView(APIView):
    """
    Dispara manualmente a execução diária pericial de selagem e verificação
    de integridade das partições ativas (RN-16).
    Exclusivo para administradores da empresa.
    """
    permission_classes = [permissions.IsAuthenticated, IsEmpresaAdmin]

    def post(self, request):
        start_time = time.time()
        data_ref = timezone.localdate()

        particoes = list(
            ForensicAuditLog.objects.filter(timestamp__date__lte=data_ref)
            .values_list("particao", flat=True)
            .distinct()
            .order_by("particao")
        )

        detalhes = []
        selos_gerados = 0
        particoes_rompidas = 0

        for p in particoes:
            # 1. Lavra/atualiza selo diário
            selo = ForensicAuditService.selar_particao_diaria(p, data_referencia=data_ref)
            # 2. Executa varredura de integridade
            res_integridade = ForensicAuditService.verificar_integridade_particao(p)
            status_particao = res_integridade.get("status", "desconhecido")
            if status_particao != "integro":
                particoes_rompidas += 1

            if selo:
                selos_gerados += 1
                detalhes.append({
                    "particao": p,
                    "status": status_particao,
                    "ultima_sequencia": selo.ultima_sequencia,
                    "total_eventos_dia": selo.total_eventos_dia,
                    "selo_digest": selo.selo_digest,
                    "tempo_ms": res_integridade.get("tempo_verificacao_ms", 0),
                })
            else:
                detalhes.append({
                    "particao": p,
                    "status": status_particao,
                    "ultima_sequencia": 0,
                    "total_eventos_dia": 0,
                    "selo_digest": "",
                    "tempo_ms": res_integridade.get("tempo_verificacao_ms", 0),
                })

        latencia_total_ms = int((time.time() - start_time) * 1000)

        if not particoes:
            mensagem = "Nenhum registro pericial encontrado até a data de hoje para selagem."
        elif particoes_rompidas == 0:
            mensagem = f"Auditoria diária executada com 100% de integridade. {selos_gerados} selo(s) lavrado(s) em {len(particoes)} partição(ões)."
        else:
            mensagem = f"ALERTA PERICIAL: {particoes_rompidas} partição(ões) com divergência detectada de um total de {len(particoes)} avaliada(s)."

        return Response({
            "sucesso": particoes_rompidas == 0,
            "mensagem": mensagem,
            "data_referencia": data_ref.isoformat(),
            "data_execucao": timezone.now().isoformat(),
            "total_particoes": len(particoes),
            "selos_gerados": selos_gerados,
            "particoes_rompidas": particoes_rompidas,
            "latencia_ms": latencia_total_ms,
            "detalhes": detalhes,
        })