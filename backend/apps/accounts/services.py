import logging
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User, PasswordlessLoginToken

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    id_token = None
    google_requests = None

logger = logging.getLogger(__name__)

MAGIC_LOGIN_EXPIRATION_MINUTES = 15

class AuthService:
    @staticmethod
    def autenticar_google(credential: str, client_id: str = None) -> tuple[dict | None, int, dict]:
        """
        Valida o ID Token do Google OAuth2, aplica regras B2B do SHM,
        sincroniza perfil e gera os tokens JWT de sessão.
        
        Retorna:
            (resultado_sucesso, status_http, erro_dict)
        """
        if settings.DEBUG and credential.startswith("dev_simulated_token:"):
            sim_email = credential.split("dev_simulated_token:", 1)[1].strip()
            idinfo = {
                "email": sim_email,
                "email_verified": True,
                "given_name": sim_email.split("@")[0].capitalize(),
                "family_name": "Google",
                "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={sim_email}",
            }
        else:
            if not GOOGLE_AUTH_AVAILABLE:
                return None, 500, {"detail": "A biblioteca 'google-auth' não está instalada no ambiente Python do servidor."}
            idinfo = None
            try:
                idinfo = id_token.verify_oauth2_token(
                    credential,
                    google_requests.Request(),
                    client_id,
                )
            except Exception as token_err:
                # Tentar validar como OAuth2 Access Token caso não seja ID Token JWT
                try:
                    import requests as req
                    resp = req.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {credential}"},
                        timeout=10,
                    )
                    if resp.status_code == 200:
                        idinfo = resp.json()
                except Exception:
                    pass

                if not idinfo:
                    return None, 400, {"detail": f"Credencial do Google inválida ou expirada: {str(token_err)}"}

        email = idinfo.get("email")
        email_verified = idinfo.get("email_verified", False)

        if not email:
            return None, 400, {"detail": "Não foi possível recuperar o e-mail associado à conta Google."}

        email_clean = email.strip().lower()

        is_verified = email_verified is True or str(email_verified).lower() in ("true", "1")
        if not is_verified:
            return None, 400, {"detail": "O endereço de e-mail da conta Google não está verificado."}

        # Regra B2B: Bloquear quem não possui e-mail cadastrado na base SHM
        user = User.objects.filter(email__iexact=email_clean).first()
        if not user:
            return None, 403, {
                "detail": f"O e-mail '{email_clean}' não está autorizado na plataforma SHM. Solicite o cadastro ao administrador da empresa ou cliente vinculado.",
                "email": email_clean,
                "code": "user_not_found",
            }

        if not user.is_active:
            return None, 403, {
                "detail": "Este usuário encontra-se inativo no sistema SHM. Contate o suporte.",
                "code": "user_inactive",
            }

        given_name = idinfo.get("given_name")
        family_name = idinfo.get("family_name")
        picture = idinfo.get("picture")

        update_fields = []
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            update_fields.append("avatar_url")
        if given_name and not user.first_name:
            user.first_name = given_name
            update_fields.append("first_name")
        if family_name and not user.last_name:
            user.last_name = family_name
            update_fields.append("last_name")
        if update_fields:
            user.save(update_fields=update_fields)

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user,
        }, 200, {}

    @staticmethod
    def solicitar_magic_login(email: str) -> tuple[PasswordlessLoginToken | None, int, dict]:
        """
        Emite um token de acesso sem senha de 15 minutos para usuário ativo e dispara e-mail transacional.
        """
        if not email:
            return None, 400, {"detail": "Informe o endereço de e-mail."}

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return None, 404, {"detail": f"O e-mail '{email}' não está cadastrado na plataforma SHM."}

        expira_em = timezone.now() + timedelta(minutes=MAGIC_LOGIN_EXPIRATION_MINUTES)
        token_obj = PasswordlessLoginToken.objects.create(
            user=user,
            expira_em=expira_em,
            usado=False,
        )

        try:
            from django.core.mail import EmailMultiAlternatives
            from apps.notificacoes.email_templates import renderizar_email_transacional

            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
            link_final = f"{frontend_url}/magic-link/{token_obj.token}"
            expira_str = timezone.localtime(expira_em).strftime("%H:%M")

            nome_usuario = user.first_name or user.username
            assunto = "Link de Acesso Seguro ao SHM"
            mensagem_texto = (
                f"Olá, {nome_usuario}!\n\n"
                f"Você solicitou o acesso sem senha à plataforma SHM.\n"
                f"Clique no botão abaixo ou utilize o link para entrar diretamente na sua conta.\n\n"
                f"• Link de Acesso: {link_final}\n"
                f"• Validade: 15 minutos (expira às {expira_str})\n\n"
                f"Caso você não tenha solicitado este acesso, desconsidere esta mensagem com segurança."
            )

            html_content = renderizar_email_transacional(
                assunto=assunto,
                mensagem_texto=mensagem_texto,
                link_final=link_final,
                cta_texto="Entrar no SHM (Acesso Seguro)",
                rodape_texto="Validade do link de acesso: 15 minutos a partir da emissão.",
            )

            msg = EmailMultiAlternatives(
                subject=f"[SHM] {assunto}",
                body=f"{mensagem_texto}\n\nAcessar link direto: {link_final}\n",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            logger.info("[EMAIL ENVIADO] Magic login enviado com sucesso para %s", user.email)
        except Exception as e:
            logger.error("[EMAIL ERRO] Falha ao enviar e-mail de magic login para %s: %s", user.email, e, exc_info=True)

        return token_obj, 200, {}

    @staticmethod
    def verificar_magic_login(token_str: str, ip: str = None, user_agent: str = None) -> tuple[dict | None, int, dict]:
        """
        Valida o token sem senha, aplica auditoria forense (IP/User-Agent),
        marca como consumido e emite o par de tokens JWT.
        """
        if not token_str:
            return None, 400, {"detail": "Token não informado."}

        token_obj = PasswordlessLoginToken.objects.select_related("user").filter(token=token_str).first()
        if not token_obj:
            return None, 404, {"detail": "Token inválido ou não encontrado."}

        if token_obj.usado:
            data_formatada = token_obj.usado_em.strftime("%d/%m/%Y às %H:%M") if token_obj.usado_em else "data anterior"
            return None, 409, {"detail": f"Este link seguro de login já foi utilizado em {data_formatada}."}

        if token_obj.esta_expirado():
            return None, 410, {"detail": "Este link de login expirou (validade de 15 minutos). Solicite um novo link."}

        agora = timezone.now()
        token_obj.usado = True
        token_obj.usado_em = agora
        token_obj.ip_origem = ip
        token_obj.user_agent = user_agent
        token_obj.save(update_fields=["usado", "usado_em", "ip_origem", "user_agent"])

        user = token_obj.user
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user,
            "metodo": "MAGIC_LINK_PASSWORDLESS",
            "ip_origem": ip,
        }, 200, {}
