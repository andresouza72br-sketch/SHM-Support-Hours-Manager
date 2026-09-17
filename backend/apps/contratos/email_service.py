import logging
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from apps.contratos.models import (
    Contrato,
    ContratoEmailNotificacao,
    StatusConfirmacaoEmail,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    AceiteLink,
)
from apps.core.utils import get_client_ip, get_client_user_agent

logger = logging.getLogger(__name__)

class ContratoEmailNotificacaoService:
    @staticmethod
    def _obter_dados_branding() -> dict:
        try:
            from apps.core.models import ConfiguracaoBranding
            branding = ConfiguracaoBranding.get_instancia()
            return {
                "empresa": branding.nome_fantasia or "SHM Tecnologia",
                "slogan": branding.slogan or "Suporte Sob Medida e Gestão de Horas",
                "telefone": branding.telefone_suporte or "",
                "email": branding.email_suporte or "",
                "url": branding.url_shm or getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/"),
            }
        except Exception:
            return {
                "empresa": "SHM Tecnologia",
                "slogan": "Suporte Sob Medida e Gestão de Horas",
                "telefone": "",
                "email": "",
                "url": getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/"),
            }

    @staticmethod
    def gerar_corpo_email_convite(destinatario: ContratoEmailNotificacao) -> tuple[str, str]:
        contrato = destinatario.contrato
        cliente = contrato.cliente
        convidador = destinatario.convidado_por
        convidador_nome = (convidador.get_full_name() or convidador.username) if convidador else "Gestor do Sistema"
        convidador_papel = convidador.get_role_display() if convidador else "Administrador"

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_confirmacao = f"{frontend_url}/confirmar-notificacao/{destinatario.token}"
        data_limite = destinatario.expira_em.strftime("%d/%m/%Y às %H:%M")
        nome_cliente = cliente.display_name if cliente else "Cliente SHM"

        b = ContratoEmailNotificacaoService._obter_dados_branding()

        # Versão Texto Simples
        texto_plano = f"""
Olá{f', {destinatario.nome}' if destinatario.nome else ''}!

Você foi cadastrado por {convidador_nome} ({convidador_papel}) para receber as notificações operacionais e financeiras do Contrato de Suporte SHM nº {contrato.numero} vinculado à empresa {nome_cliente}.

O QUE VOCÊ RECEBERÁ AO CONFIRMAR:
1. ⏳ Alertas periódicos de saldo e consumo da franquia de horas contratadas.
2. 📋 Acompanhamento de pedidos técnicos (abertura, orçamentos, aprovações e entregas).
3. 📑 Cópias de extratos de consumo e fechamento de ciclos.
4. 📜 Avisos sobre renovações ou termos aditivos contratuais.

Para confirmar o recebimento e ativar as notificações em seu e-mail ({destinatario.email}), acesse o link abaixo:
{link_confirmacao}

⚠️ IMPORTANTE: Este link de confirmação possui validade estrita de 15 dias (expira em {data_limite}).

Caso você não reconheça este cadastro ou deseje recusar, basta acessar o link acima e clicar em "Recusar Recebimento".

Atenciosamente,
Equipe {b['empresa']} — {b['slogan']}
{f"Telefone: {b['telefone']} • " if b['telefone'] else ""}{b['url']}
        """.strip()

        # Versão HTML Elegante & Responsiva
        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de E-mail para Notificações SHM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header com Gradiente SHM -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 30px; text-align: center;">
              <table border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="background-color: #ffffff; width: 44px; height: 44px; border-radius: 14px; text-align: center; vertical-align: middle; font-weight: 900; font-size: 22px; color: #4f46e5; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    S
                  </td>
                  <td style="padding-left: 12px; text-align: left;">
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1;">SHM</div>
                    <div style="font-size: 11px; font-weight: 700; color: #e0e7ff; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Suporte Sob Medida</div>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 20px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Confirmação de Notificações</h1>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Olá<strong>{f', {destinatario.nome}' if destinatario.nome else ''}</strong>!
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Você foi incluído por <strong>{convidador_nome}</strong> ({convidador_papel}) na lista de destinatários oficiais de notificações do contrato de suporte técnico abaixo:
              </p>

              <!-- Card com Dados do Contrato -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Contrato & Empresa</div>
                    <div style="font-size: 16px; font-weight: 900; color: #1e293b; font-family: monospace;">{contrato.numero}</div>
                    <div style="font-size: 13px; font-weight: 700; color: #4f46e5; margin-top: 2px;">{nome_cliente}</div>
                  </td>
                </tr>
              </table>

              <!-- O que vai receber -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">📋 O que você receberá ao confirmar:</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #475569;">
                  <li><strong>Alertas de Franquia de Horas:</strong> Avisos de consumo (80% atingido, saldo disponível e limite).</li>
                  <li><strong>Chamados & Pedidos:</strong> Notificações de abertura, orçamentos, aprovações e conclusões.</li>
                  <li><strong>Extratos & Relatórios:</strong> Cópias de fechamento de ciclos de suporte e faturamento.</li>
                  <li><strong>Termos & Aditivos:</strong> Notificações de renovação ou termos aditivos do contrato.</li>
                </ul>
              </div>

              <!-- Botão de Ação -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{link_confirmacao}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                      ✓ Confirmar e Ativar Notificações
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Validade de 15 Dias -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px;">
                <tr>
                  <td style="font-size: 12px; color: #92400e; font-weight: 600; line-height: 1.5;">
                    ⏱️ <strong>Validade de 15 dias:</strong> Este link é seguro, individual e expira em <strong>{data_limite}</strong>.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                Caso não reconheça esta solicitação, você pode recusar o recebimento clicando no link acima.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
                <strong>{b['empresa']}</strong> — {b['slogan']}<br>
                {f"Telefone: {b['telefone']} &bull; " if b['telefone'] else ""}<a href="{b['url']}" target="_blank" style="color: #4f46e5; text-decoration: none;">{b['url']}</a><br>
                Este é um e-mail automático gerado pelo sistema com trilha de auditoria forense.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_convite_confirmacao_email(destinatario: ContratoEmailNotificacao, request=None) -> bool:
        """
        Dispara o e-mail de convite/confirmação com magic link de 15 dias e registra auditoria.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CONTRATO_CONVITE_CONFIRMACAO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de convite de confirmação de e-mail desativado por configuração do administrador.")
            return True

        try:
            contrato = destinatario.contrato
            texto_plano, html_conteudo = ContratoEmailNotificacaoService.gerar_corpo_email_convite(destinatario)

            assunto = f"[SHM] Confirmação de Notificações do Contrato {contrato.numero} — {contrato.cliente.display_name}"
            remetente = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <suporte@shm.com>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=remetente,
                to=[destinatario.email],
            )
            msg.attach_alternative(html_conteudo, "text/html")
            msg.send(fail_silently=False)

            # Gravar auditoria do disparo de convite
            ip = get_client_ip(request) if request else ""
            ua = get_client_user_agent(request) if request else ""
            convidador_nome = (
                destinatario.convidado_por.get_full_name() or destinatario.convidado_por.username
                if destinatario.convidado_por
                else "Sistema"
            )

            ContratoAuditLog.objects.create(
                contrato=contrato,
                tipo_evento=TipoEventoContratoAudit.CONVITE_EMAIL,
                descricao=f"Convite de confirmação de e-mail de notificação enviado para '{destinatario.email}' por {convidador_nome} (Validade: 15 dias até {destinatario.expira_em.strftime('%d/%m/%Y')}).",
                usuario=destinatario.convidado_por,
                ip_origem=ip,
                user_agent=ua,
            )
            return True
        except Exception as err:
            logger.error(f"Erro ao enviar e-mail de convite para {destinatario.email}: {err}", exc_info=True)
            return False

    @staticmethod
    def sincronizar_destinatarios_contrato(contrato: Contrato, lista_emails: list, usuario_solicitante, request=None):
        """
        Sincroniza a lista de e-mails de notificação do contrato:
        - Cria novos destinatários com token de 15 dias e envia convite de confirmação.
        - Atualiza status ativo dos existentes.
        - Remove e-mails que foram deletados da lista.
        """
        emails_recebidos = set()
        agora = timezone.now()
        expiracao_15_dias = agora + timedelta(days=15)

        for item in lista_emails:
            if not isinstance(item, dict):
                continue
            email_limpo = str(item.get("email", "")).strip().lower()
            if not email_limpo or "@" not in email_limpo:
                continue

            emails_recebidos.add(email_limpo)
            nome = str(item.get("nome", "")).strip() or None
            ativo = bool(item.get("ativo", True))

            dest, created = ContratoEmailNotificacao.objects.get_or_create(
                contrato=contrato,
                email=email_limpo,
                defaults={
                    "nome": nome,
                    "ativo": ativo,
                    "status": StatusConfirmacaoEmail.PENDENTE,
                    "convidado_por": usuario_solicitante,
                    "expira_em": expiracao_15_dias,
                },
            )

            if created:
                # Dispara o e-mail de convite com validade de 15 dias
                ContratoEmailNotificacaoService.enviar_convite_confirmacao_email(dest, request)
            else:
                # Atualizar nome ou ativo se modificado
                mudou = False
                if nome and dest.nome != nome:
                    dest.nome = nome
                    mudou = True
                if dest.ativo != ativo:
                    dest.ativo = ativo
                    mudou = True
                if mudou:
                    dest.save()

        # Remove destinatários que não constam mais na nova lista
        ContratoEmailNotificacao.objects.filter(contrato=contrato).exclude(email__in=emails_recebidos).delete()

    @staticmethod
    def processar_confirmacao(token_str: str, request=None) -> dict:
        """
        Processa a confirmação pública do magic link pelo destinatário.
        """
        try:
            destinatario = ContratoEmailNotificacao.objects.select_related("contrato", "contrato__cliente", "convidado_por").get(token=token_str)
        except Exception:
            return {"sucesso": False, "codigo": "token_invalido", "mensagem": "Token de confirmação inválido ou não encontrado."}

        agora = timezone.now()

        # Verificar se já expirou (> 15 dias)
        if destinatario.expira_em and agora > destinatario.expira_em:
            destinatario.status = StatusConfirmacaoEmail.EXPIRADO
            destinatario.save(update_fields=["status"])
            return {
                "sucesso": False,
                "codigo": "token_expirado",
                "mensagem": "Este link de confirmação expirou após o prazo de 15 dias. Solicite o reenvio ao gestor do contrato.",
                "destinatario": destinatario,
            }

        # Atualizar status para CONFIRMADO
        ip = get_client_ip(request) if request else ""
        ua = get_client_user_agent(request) if request else ""

        destinatario.status = StatusConfirmacaoEmail.CONFIRMADO
        destinatario.ativo = True
        destinatario.confirmado_em = agora
        destinatario.confirmado_ip = ip
        destinatario.confirmado_user_agent = ua
        destinatario.save()

        # Atualizar JSON de e-mails no Contrato para sincronia
        contrato = destinatario.contrato
        emails_json = list(contrato.emails_notificacao or [])
        encontrou = False
        for it in emails_json:
            if it.get("email", "").lower() == destinatario.email.lower():
                it["ativo"] = True
                it["status"] = StatusConfirmacaoEmail.CONFIRMADO
                encontrou = True
                break
        if not encontrou:
            emails_json.append({"email": destinatario.email, "nome": destinatario.nome, "ativo": True, "status": StatusConfirmacaoEmail.CONFIRMADO})
        contrato.emails_notificacao = emails_json
        contrato.save(update_fields=["emails_notificacao"])

        # Gravar log de auditoria
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
            descricao=f"Destinatário '{destinatario.email}' confirmou o recebimento de notificações do contrato {contrato.numero} via Magic Link.",
            ip_origem=ip,
            user_agent=ua,
        )

        return {
            "sucesso": True,
            "codigo": "confirmado",
            "mensagem": "E-mail confirmado com sucesso! Você agora receberá as notificações do contrato.",
            "destinatario": destinatario,
        }

    @staticmethod
    def processar_recusa(token_str: str, request=None) -> dict:
        """
        Processa a recusa de recebimento pelo destinatário.
        """
        try:
            destinatario = ContratoEmailNotificacao.objects.select_related("contrato", "contrato__cliente").get(token=token_str)
        except Exception:
            return {"sucesso": False, "codigo": "token_invalido", "mensagem": "Token de confirmação inválido ou não encontrado."}

        ip = get_client_ip(request) if request else ""
        ua = get_client_user_agent(request) if request else ""

        destinatario.status = StatusConfirmacaoEmail.RECUSADO
        destinatario.ativo = False
        destinatario.save(update_fields=["status", "ativo"])

        # Gravar log de auditoria
        ContratoAuditLog.objects.create(
            contrato=destinatario.contrato,
            tipo_evento=TipoEventoContratoAudit.RECUSA_EMAIL,
            descricao=f"Destinatário '{destinatario.email}' recusou formalmente o recebimento de notificações do contrato {destinatario.contrato.numero}.",
            ip_origem=ip,
            user_agent=ua,
        )

        return {
            "sucesso": True,
            "codigo": "recusado",
            "mensagem": "Recebimento de notificações recusado. Você não receberá alertas deste contrato.",
            "destinatario": destinatario,
        }

    @staticmethod
    def gerar_corpo_email_aceite_contrato(contrato: Contrato, aceite_link: AceiteLink) -> tuple[str, str]:
        cliente = contrato.cliente
        convidador = contrato.criado_por
        convidador_nome = (convidador.get_full_name() or convidador.username) if convidador else "Gestor do Sistema"
        convidador_papel = convidador.get_role_display() if convidador else "Administrador"

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_aceite = f"{frontend_url}/aceite-contrato/{aceite_link.token}"
        data_limite = (
            aceite_link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
            if hasattr(aceite_link.data_expiracao, "strftime")
            else str(aceite_link.data_expiracao)
        )
        nome_cliente = cliente.display_name if cliente else "Cliente SHM"
        destinatario_nome = contrato.gestor_nome or "Responsável pelo Contrato"

        def _fmt_date(d):
            if not d:
                return ""
            if hasattr(d, "strftime"):
                return d.strftime("%d/%m/%Y")
            s = str(d).split("T")[0].split("-")
            if len(s) == 3:
                return f"{s[2]}/{s[1]}/{s[0]}"
            return str(d)

        tipo_nome = contrato.get_tipo_display() if hasattr(contrato, "get_tipo_display") else "Novo Contrato"
        data_ini_str = _fmt_date(contrato.data_inicio) or "A definir"
        data_fim_str = _fmt_date(contrato.data_termino) or "Indeterminada"
        horas_str = f"{float(contrato.horas_contratadas):.1f}h" if contrato.horas_contratadas else "0.0h"
        valor_str = f"R$ {float(contrato.valor_mensal):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if contrato.valor_mensal else "Não informado"
        dia_fat_str = f"Dia {contrato.dia_faturamento}" if contrato.dia_faturamento else "Não informado"
        desc_servicos = contrato.descricao_servicos or "Prestação de serviços técnicos especializados de suporte e sustentação."

        texto_plano = f"""
Olá, {destinatario_nome}!

Um novo Contrato de Suporte Técnico foi cadastrado no sistema SHM por {convidador_nome} ({convidador_papel}) vinculado à empresa {nome_cliente}.

📋 DADOS DO CONTRATO:
• Número: {contrato.numero} ({tipo_nome})
• Franquia de Horas: {horas_str}
• Período de Vigência: {data_ini_str} a {data_fim_str}
• Valor Mensal: {valor_str} (Faturamento: {dia_fat_str})
• Objeto dos Serviços: {desc_servicos}
• Gestor Responsável: {contrato.gestor_nome or 'Não especificado'}

⚠️ AUTORIZAÇÃO DE INÍCIO DOS TRABALHOS:
Para concordar formalmente com as condições do contrato, autorizar o início dos trabalhos técnicos pela equipe e liberar o uso da plataforma para abertura de chamados e controle de franquia de horas, acesse o link seguro abaixo:
{link_aceite}

⏱️ IMPORTANTE: Este link de aceite eletrônico possui validade de 30 dias (expira em {data_limite}).

Atenciosamente,
Equipe SHM — Support Hours Manager
        """.strip()

        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aceite de Contrato — SHM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header com Gradiente SHM -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 30px; text-align: center;">
              <table border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="background-color: #ffffff; width: 44px; height: 44px; border-radius: 14px; text-align: center; vertical-align: middle; font-weight: 900; font-size: 22px; color: #4f46e5; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    S
                  </td>
                  <td style="padding-left: 12px; text-align: left;">
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1;">SHM</div>
                    <div style="font-size: 11px; font-weight: 700; color: #e0e7ff; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Suporte Sob Medida</div>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 20px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Aceite de Contrato & Início dos Trabalhos</h1>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Olá, <strong>{destinatario_nome}</strong>!
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Um novo contrato de suporte técnico foi registrado no sistema SHM por <strong>{convidador_nome}</strong> ({convidador_papel}) para a empresa <strong>{nome_cliente}</strong>.
              </p>

              <!-- Card com Dados do Contrato -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Número do Contrato</div>
                    <div style="font-size: 18px; font-weight: 900; color: #1e293b; font-family: monospace;">{contrato.numero} <span style="font-size: 11px; font-weight: 700; color: #4f46e5; background: #e0e7ff; padding: 2px 8px; border-radius: 8px; vertical-align: middle;">{tipo_nome}</span></div>
                    <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 4px;">{nome_cliente}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-bottom: 10px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Franquia Contratada</div>
                          <div style="font-size: 14px; font-weight: 900; color: #4f46e5;">{horas_str}</div>
                        </td>
                        <td width="50%" style="vertical-align: top; padding-bottom: 10px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Período de Vigência</div>
                          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">{data_ini_str} a {data_fim_str}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Valor Mensal</div>
                          <div style="font-size: 13px; font-weight: 800; color: #1e293b;">{valor_str}</div>
                        </td>
                        <td width="50%" style="vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Faturamento</div>
                          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">{dia_fat_str}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Objeto / Descrição dos Serviços -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; border-radius: 0 12px 12px 0; padding: 12px 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Objeto & Escopo dos Serviços</div>
                <div style="font-size: 13px; color: #334155; line-height: 1.5;">{desc_servicos}</div>
              </div>

              <!-- Termo de Concordância -->
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                O aceite eletrônico é necessário para <strong>autorizar o início dos trabalhos pela equipe técnica</strong>, a <strong>abertura de chamados</strong> e o <strong>uso do sistema</strong> de acompanhamento de saldo de horas.
              </p>

              <!-- Botão de Ação -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{link_aceite}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                      ✓ Revisar Contrato e Concordar com Início dos Trabalhos
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Validade de 30 Dias -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px;">
                <tr>
                  <td style="font-size: 12px; color: #1e40af; font-weight: 600; line-height: 1.5;">
                    🔒 <strong>Segurança & Validade:</strong> Este link é seguro, individual e expira em <strong>{data_limite}</strong> (validade de 30 dias).
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
                SHM — Support Hours Manager • Plataforma de Governança e Gestão de Horas Técnicas<br>
                Este é um e-mail automático com trilha de auditoria forense integrada.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_email_aceite_contrato(contrato: Contrato, aceite_link: AceiteLink, request=None) -> bool:
        """
        Envia e-mail formal com Magic Link de aceite UNICAMENTE para o gestor responsável do contrato
        para autorização de início dos trabalhos e uso do sistema.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CONTRATO_ACEITE_SOLICITADO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de e-mail de aceite de contrato desativado por configuração do administrador.")
            return True

        try:
            destinatarios_emails = set()

            # Envio estritamente para o gestor do contrato
            if contrato.gestor_email and "@" in contrato.gestor_email:
                destinatarios_emails.add(contrato.gestor_email.strip().lower())
            elif contrato.cliente and contrato.cliente.email_contato and "@" in contrato.cliente.email_contato:
                destinatarios_emails.add(contrato.cliente.email_contato.strip().lower())

            if not destinatarios_emails:
                logger.warning(f"Contrato {contrato.numero} não possui gestor_email nem email de contato do cliente para envio do aceite.")
                return False

            texto_plano, html_conteudo = ContratoEmailNotificacaoService.gerar_corpo_email_aceite_contrato(contrato, aceite_link)
            nome_cliente = contrato.cliente.display_name if contrato.cliente else "Cliente"
            assunto = f"[SHM] Aceite do Contrato de Suporte {contrato.numero} — {nome_cliente} (Autorização de Início dos Trabalhos)"
            remetente = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <suporte@shm.com>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=remetente,
                to=list(destinatarios_emails),
            )
            msg.attach_alternative(html_conteudo, "text/html")
            msg.send(fail_silently=False)

            ip = get_client_ip(request) if request else ""
            ua = get_client_user_agent(request) if request else ""
            criador_nome = (
                contrato.criado_por.get_full_name() or contrato.criado_por.username
                if contrato.criado_por
                else "Sistema"
            )

            exp_str = (
                aceite_link.data_expiracao.strftime('%d/%m/%Y')
                if hasattr(aceite_link.data_expiracao, 'strftime')
                else str(aceite_link.data_expiracao)
            )
            ContratoAuditLog.objects.create(
                contrato=contrato,
                tipo_evento=TipoEventoContratoAudit.CONVITE_EMAIL,
                descricao=(
                    f"Magic Link de aceite e início dos trabalhos enviado exclusivamente para o gestor "
                    f"'{', '.join(destinatarios_emails)}' por {criador_nome} (Validade: 30 dias até {exp_str})."
                ),
                usuario=contrato.criado_por,
                ip_origem=ip,
                user_agent=ua,
            )
            return True
        except Exception as err:
            logger.error(f"Erro ao enviar e-mail de aceite do contrato {contrato.numero}: {err}", exc_info=True)
            return False

    @staticmethod
    def gerar_corpo_email_contrato_ativado(contrato: Contrato) -> tuple[str, str]:
        cliente = contrato.cliente
        nome_cliente = cliente.display_name if cliente else "Cliente SHM"
        destinatario_gestor = contrato.gestor_nome or "Gestor Responsável"

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_contrato = f"{frontend_url}/contratos/{contrato.id}/extrato"

        def _fmt_date(d):
            if not d:
                return ""
            if hasattr(d, "strftime"):
                return d.strftime("%d/%m/%Y")
            s = str(d).split("T")[0].split("-")
            if len(s) == 3:
                return f"{s[2]}/{s[1]}/{s[0]}"
            return str(d)

        def _fmt_datetime(d):
            if not d:
                return ""
            if hasattr(d, "strftime"):
                return d.strftime("%d/%m/%Y às %H:%M")
            return str(d)

        data_aceite_str = _fmt_datetime(contrato.data_aceite) or "Data Recente"
        tipo_nome = contrato.get_tipo_display() if hasattr(contrato, "get_tipo_display") else "Novo Contrato"
        data_ini_str = _fmt_date(contrato.data_inicio) or "A definir"
        data_fim_str = _fmt_date(contrato.data_termino) or "Indeterminada"
        horas_str = f"{float(contrato.horas_contratadas):.1f}h" if contrato.horas_contratadas else "0.0h"
        saldo_str = f"{float(contrato.saldo):.1f}h" if contrato.saldo else horas_str
        valor_str = f"R$ {float(contrato.valor_mensal):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if contrato.valor_mensal else "Não informado"
        dia_fat_str = f"Dia {contrato.dia_faturamento}" if contrato.dia_faturamento else "Não informado"
        desc_servicos = contrato.descricao_servicos or "Prestação de serviços técnicos especializados de suporte e sustentação."

        texto_plano = f"""
CONFIRMAÇÃO: Contrato Ativado e Início dos Trabalhos Autorizado!

Informamos que o Contrato de Suporte Técnico nº {contrato.numero} vinculado à empresa {nome_cliente} teve o seu aceite formalizado com sucesso por {destinatario_gestor} em {data_aceite_str}.

📋 DADOS DO CONTRATO ATIVADO:
• Número: {contrato.numero} ({tipo_nome})
• Empresa / Cliente: {nome_cliente}
• Franquia Liberada: {horas_str} (Saldo Disponível: {saldo_str})
• Período de Vigência: {data_ini_str} a {data_fim_str}
• Valor Mensal: {valor_str} (Faturamento: {dia_fat_str})
• Gestor Responsável: {destinatario_gestor}
• Objeto dos Serviços: {desc_servicos}

⚡ STATUS DO CONTRATO: ATIVO
A equipe técnica da Empresa e os usuários do Cliente estão formalmente autorizados a iniciar a execução das atividades, abertura de chamados técnicos e acompanhamento de saldo de horas.

Para visualizar o extrato, consumo e auditoria deste contrato, acesse o link abaixo:
{link_contrato}

Atenciosamente,
Equipe SHM — Support Hours Manager
        """.strip()

        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato Ativado — SHM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header com Gradiente Emerald/Teal SHM -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 36px 30px; text-align: center;">
              <table border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="background-color: #ffffff; width: 44px; height: 44px; border-radius: 14px; text-align: center; vertical-align: middle; font-weight: 900; font-size: 22px; color: #059669; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    ✓
                  </td>
                  <td style="padding-left: 12px; text-align: left;">
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1;">SHM</div>
                    <div style="font-size: 11px; font-weight: 700; color: #d1fae5; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Contrato Ativado</div>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 20px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">Início dos Trabalhos Autorizado</h1>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Olá!
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                O aceite formal do Contrato de Suporte Técnico <strong>{contrato.numero}</strong> foi concluído com sucesso por <strong>{destinatario_gestor}</strong> em <strong>{data_aceite_str}</strong>.
              </p>

              <!-- Card com Dados do Contrato Ativo -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; padding: 18px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Contrato Ativo & Formalizado</div>
                    <div style="font-size: 18px; font-weight: 900; color: #1e293b; font-family: monospace;">{contrato.numero} <span style="font-size: 11px; font-weight: 700; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 8px; vertical-align: middle;">ATIVO</span></div>
                    <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 4px;">{nome_cliente}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-bottom: 10px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Franquia Disponível</div>
                          <div style="font-size: 14px; font-weight: 900; color: #059669;">{saldo_str}</div>
                        </td>
                        <td width="50%" style="vertical-align: top; padding-bottom: 10px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Período de Vigência</div>
                          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">{data_ini_str} a {data_fim_str}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Valor Mensal</div>
                          <div style="font-size: 13px; font-weight: 800; color: #1e293b;">{valor_str}</div>
                        </td>
                        <td width="50%" style="vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Gestor Responsável</div>
                          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">{destinatario_gestor}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Objeto / Descrição dos Serviços -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #059669; border-radius: 0 12px 12px 0; padding: 12px 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Objeto & Escopo dos Serviços</div>
                <div style="font-size: 13px; color: #334155; line-height: 1.5;">{desc_servicos}</div>
              </div>

              <!-- Autorização de Início -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 13px; color: #065f46; font-weight: 700; line-height: 1.6;">
                    🚀 <strong>Trabalhos Autorizados:</strong> A equipe técnica e os usuários do cliente já podem registrar e atender chamados com débito de horas garantido pelo saldo do contrato.
                  </td>
                </tr>
              </table>

              <!-- Botão de Ação -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="{link_contrato}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                      Visualizar Extrato & Contrato no SHM &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
                SHM — Support Hours Manager • Notificação oficial de ativação de contrato.<br>
                Este é um e-mail automático gerado pela plataforma.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_email_contrato_ativado(contrato: Contrato, request=None) -> bool:
        """
        Dispara e-mail de notificação de contrato aceito/ativado para:
        1. Toda a equipe da Empresa (Admins e Técnicos ativos).
        2. Todos os e-mails de notificação listados no contrato (emails_notificacao).
        3. Gestor do contrato e gerentes do cliente.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CONTRATO_ATIVADO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de e-mail de contrato ativado desativado por configuração do administrador.")
            return True

        try:
            from apps.accounts.models import User, UserRole

            destinatarios_emails = set()

            # 1. Toda a equipe da Empresa (Admins e Técnicos)
            empresa_users = User.objects.filter(
                role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
                is_active=True,
            )
            for u in empresa_users:
                if u.email and "@" in u.email:
                    destinatarios_emails.add(u.email.strip().lower())

            # 2. Lista de e-mails de notificação do contrato
            if contrato.emails_notificacao and isinstance(contrato.emails_notificacao, list):
                for item in contrato.emails_notificacao:
                    if isinstance(item, dict) and item.get("email"):
                        email_clean = str(item.get("email")).strip().lower()
                        if "@" in email_clean:
                            destinatarios_emails.add(email_clean)

            # Destinatários relacionais de notificação cadastrados
            for dest in contrato.destinatarios_notificacao.all():
                if dest.email and "@" in dest.email:
                    destinatarios_emails.add(dest.email.strip().lower())

            # 3. Gestor do contrato
            if contrato.gestor_email and "@" in contrato.gestor_email:
                destinatarios_emails.add(contrato.gestor_email.strip().lower())

            # Gerentes do cliente vinculados
            if contrato.cliente:
                cliente_gerentes = User.objects.filter(
                    cliente=contrato.cliente,
                    role=UserRole.CLIENTE_GERENTE,
                    is_active=True,
                )
                for g in cliente_gerentes:
                    if g.email and "@" in g.email:
                        destinatarios_emails.add(g.email.strip().lower())

            if not destinatarios_emails:
                logger.warning(f"Nenhum destinatário encontrado para aviso de contrato ativado {contrato.numero}.")
                return False

            texto_plano, html_conteudo = ContratoEmailNotificacaoService.gerar_corpo_email_contrato_ativado(contrato)
            nome_cliente = contrato.cliente.display_name if contrato.cliente else "Cliente"
            assunto = f"[SHM] Contrato {contrato.numero} Ativado — Início dos Trabalhos Autorizado ({nome_cliente})"
            remetente = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <suporte@shm.com>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=remetente,
                to=list(destinatarios_emails),
            )
            msg.attach_alternative(html_conteudo, "text/html")
            msg.send(fail_silently=False)

            ip = get_client_ip(request) if request else ""
            ua = get_client_user_agent(request) if request else ""

            ContratoAuditLog.objects.create(
                contrato=contrato,
                tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
                descricao=(
                    f"Avisos de contrato aceito e início dos trabalhos autorizados enviados por e-mail para "
                    f"{len(destinatarios_emails)} destinatários ({', '.join(sorted(destinatarios_emails))})."
                ),
                ip_origem=ip,
                user_agent=ua,
            )
            return True
        except Exception as err:
            logger.error(f"Erro ao enviar avisos de contrato ativado {contrato.numero}: {err}", exc_info=True)
            return False

    @staticmethod
    def gerar_corpo_email_migracao_saldo(contrato_origem: Contrato, contrato_destino: Contrato, quantidade: Decimal, motivo: str = None) -> tuple[str, str]:
        cliente = contrato_origem.cliente or contrato_destino.cliente
        nome_cliente = cliente.display_name if cliente else "Cliente SHM"
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_extrato = f"{frontend_url}/contratos/{contrato_destino.id}/extrato"
        qtd_str = f"{quantidade:.1f}h"

        texto_plano = f"""
Olá!

Informamos que foi realizado o APROVEITAMENTO E MIGRAÇÃO DE SALDO entre contratos da empresa {nome_cliente}:

DETALHES DA MIGRAÇÃO:
• Contrato de Origem (Encerrado): {contrato_origem.numero}
• Contrato de Destino (Vigente): {contrato_destino.numero}
• Horas Aproveitadas / Migradas: {qtd_str}
• Novo Saldo Disponível no Contrato {contrato_destino.numero}: {contrato_destino.saldo:.1f}h
• Motivo / Justificativa: {motivo or 'Aproveitamento de saldo remanescente'}

Esta operação foi registrada com carimbo de integridade no Livro-Razão Forense (Ledger) e na Linha do Tempo de Auditoria de ambos os contratos.

Acesse o extrato completo para acompanhar:
{link_extrato}

Atenciosamente,
Equipe SHM — Support Hours Manager
        """.strip()

        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aproveitamento e Migração de Saldo de Contrato</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d97706 0%, #4f46e5 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">⚡ Aproveitamento de Saldo Contratual</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #fef3c7; font-weight: 600;">{nome_cliente}</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Informamos que o saldo positivo remanescente de <strong>{qtd_str}</strong> do contrato encerrado foi transferido e aproveitado no novo contrato vigente.
              </p>

              <!-- Card de Transferência -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 20px 0; padding: 18px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Contrato Origem (Encerrado):</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 800; text-align: right;">{contrato_origem.numero}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Contrato Destino (Vigente):</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #4f46e5; font-weight: 800; text-align: right;">{contrato_destino.numero}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Horas Migradas:</td>
                  <td style="padding: 6px 0; font-size: 15px; color: #16a34a; font-weight: 900; text-align: right;">+{qtd_str}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Novo Saldo no Contrato Destino:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 900; text-align: right;">{contrato_destino.saldo:.1f}h</td>
                </tr>
              </table>

              <div style="background-color: #f1f5f9; border-left: 4px solid #d97706; border-radius: 0 12px 12px 0; padding: 12px 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 4px;">Motivo do Aproveitamento</div>
                <div style="font-size: 13px; color: #334155; line-height: 1.5;">{motivo or 'Aproveitamento de saldo remanescente entre contratos.'}</div>
              </div>

              <!-- Botão -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="{link_extrato}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 13px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                      Visualizar Extrato & Trilha de Auditoria
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
                SHM — Support Hours Manager • Governança e Transparência Contratual
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_email_migracao_saldo(contrato_origem: Contrato, contrato_destino: Contrato, quantidade: Decimal, autor=None, motivo: str = None, request=None) -> bool:
        """
        Dispara e-mail de notificação de aproveitamento/migração de saldo para:
        1. Gestor do contrato de origem.
        2. Gestor do contrato de destino.
        3. Gerentes do cliente (CLIENTE_GERENTE).
        4. Administradores da empresa.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CONTRATO_MIGRACAO_SALDO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de e-mail de migração de saldo desativado por configuração do administrador.")
            return True

        try:
            from apps.accounts.models import User, UserRole

            destinatarios_emails = set()

            # Gestor de origem e de destino
            if contrato_origem.gestor_email and "@" in contrato_origem.gestor_email:
                destinatarios_emails.add(contrato_origem.gestor_email.strip().lower())
            if contrato_destino.gestor_email and "@" in contrato_destino.gestor_email:
                destinatarios_emails.add(contrato_destino.gestor_email.strip().lower())

            # Gerentes do cliente
            cliente = contrato_origem.cliente or contrato_destino.cliente
            if cliente:
                gerentes = User.objects.filter(cliente=cliente, role=UserRole.CLIENTE_GERENTE, is_active=True)
                for g in gerentes:
                    if g.email and "@" in g.email:
                        destinatarios_emails.add(g.email.strip().lower())

            # Admins da empresa
            admins = User.objects.filter(role=UserRole.EMPRESA_ADMIN, is_active=True)
            for a in admins:
                if a.email and "@" in a.email:
                    destinatarios_emails.add(a.email.strip().lower())

            if not destinatarios_emails:
                return False

            texto_plano, html_conteudo = ContratoEmailNotificacaoService.gerar_corpo_email_migracao_saldo(
                contrato_origem, contrato_destino, quantidade, motivo
            )
            nome_cliente = cliente.display_name if cliente else "Cliente"
            assunto = f"[SHM] Aproveitamento de Saldo: {quantidade:.1f}h migradas ({contrato_origem.numero} ➔ {contrato_destino.numero}) — {nome_cliente}"
            remetente = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <suporte@shm.com>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=remetente,
                to=list(destinatarios_emails),
            )
            msg.attach_alternative(html_conteudo, "text/html")
            msg.send(fail_silently=False)

            ip = get_client_ip(request) if request else ""
            ua = get_client_user_agent(request) if request else ""

            ContratoAuditLog.objects.create(
                contrato=contrato_destino,
                tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
                descricao=f"Notificação de aproveitamento de {quantidade:.1f}h enviada para {len(destinatarios_emails)} destinatários ({', '.join(sorted(destinatarios_emails))}).",
                ip_origem=ip,
                user_agent=ua,
            )
            ContratoAuditLog.objects.create(
                contrato=contrato_origem,
                tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
                descricao=f"Notificação de aproveitamento de {quantidade:.1f}h enviada para {len(destinatarios_emails)} destinatários ({', '.join(sorted(destinatarios_emails))}).",
                ip_origem=ip,
                user_agent=ua,
            )
            return True
        except Exception as err:
            logger.error(f"Erro ao enviar e-mail de migração de saldo: {err}", exc_info=True)
            return False

    @staticmethod
    def gerar_corpo_email_compensacao_debito(contrato_novo: Contrato, contrato_devedor: Contrato, quantidade: Decimal, motivo: str = None) -> tuple[str, str]:
        cliente = contrato_novo.cliente or contrato_devedor.cliente
        nome_cliente = cliente.display_name if cliente else "Cliente SHM"
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_extrato = f"{frontend_url}/contratos/{contrato_novo.id}/extrato"
        qtd_str = f"{quantidade:.1f}h"

        texto_plano = f"""
Olá!

Informamos que foi realizada a COMPENSAÇÃO E QUITAÇÃO DE DÉBITO TÉCNICO entre contratos da empresa {nome_cliente}:

DETALHES DA OPERAÇÃO:
• Contrato Novo (Origem do Crédito): {contrato_novo.numero}
• Contrato Devedor (Regularizado): {contrato_devedor.numero}
• Horas Compensadas/Abatidas: {qtd_str}
• Saldo Atual do Contrato {contrato_devedor.numero}: {contrato_devedor.saldo:.1f}h
• Saldo Restante no Novo Contrato {contrato_novo.numero}: {contrato_novo.saldo:.1f}h
• Motivo: {motivo or 'Quitação de saldo devedor através de horas do novo contrato'}

Acesse o extrato para conferir a trilha de auditoria:
{link_extrato}

Atenciosamente,
Equipe SHM — Support Hours Manager
        """.strip()

        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compensação e Quitação de Débito Contratual</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">⚖️ Compensação & Regularização de Horas</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #e0f2fe; font-weight: 600;">{nome_cliente}</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Informamos que <strong>{qtd_str}</strong> foram abatidas da franquia inicial do novo contrato <strong>{contrato_novo.numero}</strong> para quitação e regularização do saldo devedor do contrato <strong>{contrato_devedor.numero}</strong>.
              </p>

              <!-- Card de Quitação -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 20px 0; padding: 18px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Contrato Devedor (Regularizado):</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 800; text-align: right;">{contrato_devedor.numero}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Novo Contrato (Franquia de Horas):</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #4f46e5; font-weight: 800; text-align: right;">{contrato_novo.numero}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Horas Abatidas / Compensadas:</td>
                  <td style="padding: 6px 0; font-size: 15px; color: #0284c7; font-weight: 900; text-align: right;">{qtd_str}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Saldo Final do Contrato Anterior:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: {'#16a34a' if contrato_devedor.saldo >= 0 else '#dc2626'}; font-weight: 900; text-align: right;">{contrato_devedor.saldo:.1f}h ({'Quitado' if contrato_devedor.saldo == 0 else 'Parcial'})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Saldo Inicial Restante no Novo Contrato:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #4f46e5; font-weight: 900; text-align: right;">{contrato_novo.saldo:.1f}h</td>
                </tr>
              </table>

              <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 0 12px 12px 0; padding: 12px 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">Motivo do Encontro de Contas</div>
                <div style="font-size: 13px; color: #334155; line-height: 1.5;">{motivo or 'Quitação de saldo devedor através de horas do novo contrato.'}</div>
              </div>

              <!-- Botão -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="{link_extrato}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); color: #ffffff; font-size: 13px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
                      Visualizar Extrato & Trilha de Auditoria
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
                SHM — Support Hours Manager • Governança e Transparência Contratual
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_email_compensacao_debito(contrato_novo: Contrato, contrato_devedor: Contrato, quantidade: Decimal, autor=None, motivo: str = None, request=None) -> bool:
        """
        Dispara e-mail de notificação de compensação/quitação de débito contratual.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CONTRATO_COMPENSACAO_DEBITO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de e-mail de compensação de débito desativado por configuração do administrador.")
            return True

        try:
            from apps.accounts.models import User, UserRole

            destinatarios_emails = set()

            if contrato_novo.gestor_email and "@" in contrato_novo.gestor_email:
                destinatarios_emails.add(contrato_novo.gestor_email.strip().lower())
            if contrato_devedor.gestor_email and "@" in contrato_devedor.gestor_email:
                destinatarios_emails.add(contrato_devedor.gestor_email.strip().lower())

            cliente = contrato_novo.cliente or contrato_devedor.cliente
            if cliente:
                gerentes = User.objects.filter(cliente=cliente, role=UserRole.CLIENTE_GERENTE, is_active=True)
                for g in gerentes:
                    if g.email and "@" in g.email:
                        destinatarios_emails.add(g.email.strip().lower())

            admins = User.objects.filter(role=UserRole.EMPRESA_ADMIN, is_active=True)
            for a in admins:
                if a.email and "@" in a.email:
                    destinatarios_emails.add(a.email.strip().lower())

            if not destinatarios_emails:
                return False

            texto_plano, html_conteudo = ContratoEmailNotificacaoService.gerar_corpo_email_compensacao_debito(
                contrato_novo, contrato_devedor, quantidade, motivo
            )
            nome_cliente = cliente.display_name if cliente else "Cliente"
            assunto = f"[SHM] Compensação de Débito: {quantidade:.1f}h abatidas ({contrato_novo.numero} ➔ {contrato_devedor.numero}) — {nome_cliente}"
            remetente = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <suporte@shm.com>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=remetente,
                to=list(destinatarios_emails),
            )
            msg.attach_alternative(html_conteudo, "text/html")
            msg.send(fail_silently=False)

            ip = get_client_ip(request) if request else ""
            ua = get_client_user_agent(request) if request else ""

            ContratoAuditLog.objects.create(
                contrato=contrato_novo,
                tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
                descricao=f"Notificação de compensação de débito de {quantidade:.1f}h enviada para {len(destinatarios_emails)} destinatários ({', '.join(sorted(destinatarios_emails))}).",
                ip_origem=ip,
                user_agent=ua,
            )
            ContratoAuditLog.objects.create(
                contrato=contrato_devedor,
                tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
                descricao=f"Notificação de compensação de débito de {quantidade:.1f}h enviada para {len(destinatarios_emails)} destinatários ({', '.join(sorted(destinatarios_emails))}).",
                ip_origem=ip,
                user_agent=ua,
            )
            return True
        except Exception as err:
            logger.error(f"Erro ao enviar e-mail de compensação de débito: {err}", exc_info=True)
            return False

    @staticmethod
    def gerar_corpo_email_extrato_oficial(
        contrato: Contrato,
        extrato_registro,
        mensagem_adicional: str = "",
    ) -> tuple[str, str]:
        cliente = contrato.cliente
        nome_cliente = cliente.display_name if cliente else "Cliente SHM"
        saldo_formatado = f"{extrato_registro.saldo_disponivel:.2f}h"
        consumo_formatado = f"{extrato_registro.horas_consumidas:.2f}h"
        franquia_formatada = f"{extrato_registro.horas_contratadas:.2f}h"

        b = ContratoEmailNotificacaoService._obter_dados_branding()

        texto_plano = f"""
Olá!

Segue em anexo o Extrato Oficial de Prestação de Contas do Contrato de Suporte SHM nº {contrato.numero} ({nome_cliente}).

RESUMO CONSOLIDADO:
• Franquia Contratada: {franquia_formatada}
• Consumo Acumulado: {consumo_formatado}
• Saldo Disponível: {saldo_formatado}
• Ciclos Homologados: {extrato_registro.quantidade_ciclos}
• Autenticidade Criptográfica (SHA-256): {extrato_registro.hash_sha256}

{f"MENSAGEM: {mensagem_adicional}" if mensagem_adicional else ""}

O documento completo encontra-se anexado a esta mensagem em formato PDF vetorial com assinatura criptográfica.

Atenciosamente,
Equipe {b['empresa']} — {b['slogan']}
{f"Telefone: {b['telefone']} • " if b['telefone'] else ""}{b['url']}
        """.strip()

        msg_box = ""
        if mensagem_adicional:
            msg_box = f"<div style='background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #1e40af; margin-bottom: 16px;'>{mensagem_adicional}</div>"

        html_conteudo = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }}
    .badge {{ display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 4px; margin-bottom: 8px; }}
    .title {{ font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }}
    .sub {{ font-size: 12px; color: #64748b; margin: 0 0 20px 0; }}
    .grid {{ display: flex; gap: 10px; margin-bottom: 20px; }}
    .box {{ flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 10px; text-align: center; }}
    .box-lbl {{ font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }}
    .box-val {{ font-size: 15px; font-weight: 800; color: #0f172a; }}
    .hash-box {{ background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 10px; color: #334155; word-break: break-all; margin-top: 20px; }}
    .footer {{ margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Prestação de Contas Oficial</span>
    <h1 class="title">Extrato do Contrato {contrato.numero}</h1>
    <p class="sub">Empresa: <strong>{nome_cliente}</strong></p>
    
    <div class="grid">
      <div class="box">
        <div class="box-lbl">Franquia</div>
        <div class="box-val">{franquia_formatada}</div>
      </div>
      <div class="box">
        <div class="box-lbl">Consumido</div>
        <div class="box-val">{consumo_formatado}</div>
      </div>
      <div class="box">
        <div class="box-lbl">Saldo Atual</div>
        <div class="box-val" style="color: {'#059669' if extrato_registro.saldo_disponivel >= 0 else '#e11d48'};">{saldo_formatado}</div>
      </div>
    </div>

    {msg_box}

    <p style="font-size: 13px; color: #475569; line-height: 1.5;">
      O demonstrativo detalhado de ciclos técnicos, horas apuradas e conciliação contábil segue anexado a esta mensagem no arquivo oficial em PDF vetorial.
    </p>

    <div class="hash-box">
      <strong>Autenticidade Forense (SHA-256):</strong><br>
      {extrato_registro.hash_sha256}
    </div>

    <div class="footer">
      <strong>{b['empresa']}</strong> — {b['slogan']}
      {f"<br>Telefone de Suporte: {b['telefone']}" if b['telefone'] else ""}
      {f" &bull; <a href='{b['url']}' style='color: #4f46e5; text-decoration: none;'>{b['url']}</a>" if b['url'] else ""}
    </div>
  </div>
</body>
</html>""".strip()
        return texto_plano, html_conteudo

    @staticmethod
    def obter_destinatarios_elegiveis_extrato(contrato: Contrato) -> dict:
        """
        Retorna a lista de destinatários habilitados para receber o extrato do contrato.
        Inclui o gestor do contrato e contatos com status CONFIRMADO.
        """
        destinatarios = []
        gestor_info = None

        if contrato.gestor_email:
            gestor_info = {
                "nome": contrato.gestor_nome or "Gestor do Contrato",
                "email": contrato.gestor_email.strip().lower(),
                "cargo": "Gestor Titular",
                "tipo": "gestor_titular",
                "selecionado_padrao": True,
            }

        notificacoes = contrato.destinatarios_notificacao.filter(
            status=StatusConfirmacaoEmail.CONFIRMADO
        ).order_by("nome", "email")

        for item in notificacoes:
            destinatarios.append({
                "id": item.id,
                "nome": item.nome or item.email.split("@")[0],
                "email": item.email.strip().lower(),
                "cargo": getattr(item, "cargo", None) or "Destinatário Homologado",
                "status": item.status,
                "selecionado_padrao": True,
            })

        total = len(destinatarios) + (1 if gestor_info else 0)
        return {
            "gestor": gestor_info,
            "destinatarios": destinatarios,
            "total_elegiveis": total,
        }

    @staticmethod
    def enviar_extrato_oficial_email(
        contrato: Contrato,
        extrato_registro,
        pdf_bytes: bytes,
        destinatarios: list = None,
        mensagem_adicional: str = "",
        usuario_solicitante=None,
        ip: str = "",
        ua: str = "",
    ) -> dict:
        """
        Envia o extrato oficial em PDF por e-mail com anexo binário para a lista de destinatários.
        """
        emails_alvo = set()

        if destinatarios and isinstance(destinatarios, list):
            for e in destinatarios:
                if isinstance(e, str) and "@" in e:
                    emails_alvo.add(e.strip().lower())
        else:
            # Padrão: todos os elegíveis
            elegiveis = ContratoEmailNotificacaoService.obter_destinatarios_elegiveis_extrato(contrato)
            if elegiveis.get("gestor") and elegiveis["gestor"].get("email"):
                emails_alvo.add(elegiveis["gestor"]["email"])
            for d in elegiveis.get("destinatarios", []):
                if d.get("email"):
                    emails_alvo.add(d["email"])

        if not emails_alvo:
            return {
                "sucesso": False,
                "mensagem": "Nenhum destinatário válido selecionado para o envio.",
                "enviados": [],
            }

        texto_plano, html_conteudo = ContratoEmailNotificacaoService.gerar_corpo_email_extrato_oficial(
            contrato, extrato_registro, mensagem_adicional
        )

        nome_cliente = contrato.cliente.display_name if contrato.cliente else "Cliente"
        assunto = f"[SHM] Extrato Oficial de Horas — Contrato {contrato.numero} ({nome_cliente})"
        remetente = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <suporte@shm.com>")
        nome_anexo = f"Extrato-{contrato.numero}-{extrato_registro.periodo_referencia}.pdf"

        msg = EmailMultiAlternatives(
            subject=assunto,
            body=texto_plano,
            from_email=remetente,
            to=list(emails_alvo),
        )
        msg.attach_alternative(html_conteudo, "text/html")
        msg.attach(nome_anexo, pdf_bytes, "application/pdf")
        msg.send(fail_silently=False)

        # Atualiza o registro do extrato
        destinatarios_lista = sorted(list(emails_alvo))
        extrato_registro.destinatarios_notificados = destinatarios_lista
        extrato_registro.save(update_fields=["destinatarios_notificados"])

        # Registro de Auditoria
        usuario_str = (
            usuario_solicitante.get_full_name() or usuario_solicitante.username
            if usuario_solicitante
            else "Rotina Agendada"
        )
        role_str = usuario_solicitante.get_role_display() if usuario_solicitante else "Sistema"

        audit_log = ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ENVIO_RELATORIO,
            descricao=f"Extrato Oficial em PDF despachado por {usuario_str} ({role_str}) para {len(destinatarios_lista)} destinatário(s): {', '.join(destinatarios_lista)}.",
            documento_nome=nome_anexo,
            documento_hash=extrato_registro.hash_sha256,
            usuario=usuario_solicitante,
            ip_origem=ip or "127.0.0.1",
            user_agent=ua or "SHM-Engine/2.5.0",
        )

        return {
            "sucesso": True,
            "mensagem": f"Extrato oficial enviado com sucesso para {len(destinatarios_lista)} destinatário(s).",
            "extrato_id": extrato_registro.id,
            "hash_sha256": extrato_registro.hash_sha256,
            "destinatarios_enviados": destinatarios_lista,
            "audit_log_id": audit_log.id,
        }



