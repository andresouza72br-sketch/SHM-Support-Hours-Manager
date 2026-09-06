import logging
from datetime import timedelta
from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from apps.schedule.models import (
    Agendamento,
    ParticipanteAgendamento,
    LembreteAgendamento,
    StatusAgendamento,
    TipoEventoSchedule,
    TipoParticipante,
    StatusPresenca,
    MarcoLembrete,
    StatusLembrete,
)
from apps.schedule.google_service import GoogleCalendarService
from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline
from apps.notificacoes.config_service import NotificacaoConfigService
from apps.notificacoes.services import NotificacaoService
from apps.contratos.forensic_service import ForensicAuditService
from apps.contratos.models import NivelRelevanciaAudit

logger = logging.getLogger(__name__)

class ScheduleService:

    @staticmethod
    def _notificar_e_auditar_criacao(
        agendamento: Agendamento,
        organizador,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        pedido = agendamento.pedido
        ciclo = agendamento.ciclo
        cliente = agendamento.cliente
        contrato = pedido.contrato if (pedido and pedido.contrato) else None
        data_formatada = agendamento.data_inicio.strftime("%d/%m/%Y às %H:%M")
        duracao_str = f"{agendamento.duracao_minutos} min"
        tipo_nome = agendamento.get_tipo_display()
        meet_link = agendamento.google_meet_link
        meet_info = f"\n• Sala Google Meet: {meet_link}" if meet_link else ""
        chamado_info = f"\n• Chamado Vinculado: {pedido.protocolo} - {pedido.assunto}" if pedido else ""
        pauta_info = f"\n• Pauta / Descrição: {agendamento.descricao}" if agendamento.descricao else ""
        cliente_nome = cliente.nome_fantasia or cliente.razao_social or str(cliente)
        url_destino = f"/schedule?agendamento={agendamento.id}"
        cta_url = meet_link if meet_link else url_destino
        cta_label = "Acessar Sala Google Meet" if meet_link else "Ver Agendamento no SHM"

        # 1. Consulta governança de notificações
        enviar_email, enviar_in_app, dests_cfg, emails_cc_cfg = (
            NotificacaoConfigService.resolver_destinatarios_evento(
                codigo="SCHEDULE_AGENDAMENTO_CRIADO",
                pedido=pedido,
                ciclo=ciclo,
                contrato=contrato,
                cliente=cliente,
                autor=organizador,
            )
        )

        cfg_obj = NotificacaoConfigService.obter_configuracao("SCHEDULE_AGENDAMENTO_CRIADO")
        nao_enviar_autor = getattr(cfg_obj, "nao_enviar_autor", True) if cfg_obj else True

        # 2. Notificação In-App
        if enviar_in_app:
            usuarios_in_app = set(dests_cfg)
            for part in agendamento.participantes.filter(usuario__isnull=False):
                usuarios_in_app.add(part.usuario)
            if organizador and hasattr(organizador, "id"):
                usuarios_in_app = {u for u in usuarios_in_app if u.id != organizador.id}

            titulo_in_app = f"Novo Compromisso Agendado: {agendamento.titulo}"
            msg_in_app = f"Reunião de {tipo_nome} agendada para {data_formatada} ({duracao_str}).{meet_info}"
            notifs = [
                Notification(
                    usuario=u,
                    titulo=titulo_in_app,
                    mensagem=msg_in_app,
                    url=url_destino,
                    lida=False,
                )
                for u in usuarios_in_app
            ]
            if notifs:
                Notification.objects.bulk_create(notifs)

        # 3. Notificação por E-mail
        if enviar_email:
            emails_dest = set()
            for part in agendamento.participantes.all():
                if part.email and "@" in part.email:
                    emails_dest.add(part.email.strip().lower())
            for u in dests_cfg:
                if u.email and "@" in u.email:
                    emails_dest.add(u.email.strip().lower())

            emails_cc = [e.strip().lower() for e in emails_cc_cfg if e and "@" in e]

            if nao_enviar_autor and organizador and getattr(organizador, "email", None):
                org_email = organizador.email.strip().lower()
                emails_dest.discard(org_email)
                emails_cc = [e for e in emails_cc if e != org_email]

            corpo_email = (
                f"Olá,\n\n"
                f"Uma nova reunião de suporte foi agendada na plataforma SHM:\n\n"
                f"• Título: {agendamento.titulo}\n"
                f"• Tipo de Reunião: {tipo_nome}\n"
                f"• Data e Horário: {data_formatada}\n"
                f"• Duração Prevista: {agendamento.duracao_minutos} minutos\n"
                f"• Cliente: {cliente_nome}"
                f"{chamado_info}"
                f"{meet_info}"
                f"{pauta_info}\n\n"
                f"Para acessar os detalhes do agendamento ou ingressar na sala virtual, utilize o botão abaixo."
            )

            if emails_dest or emails_cc:
                NotificacaoService._enviar_email(
                    destinatarios=list(emails_dest),
                    assunto=f"Reunião Agendada: {agendamento.titulo} ({data_formatada})",
                    mensagem_texto=corpo_email,
                    url_destino=cta_url,
                    cta_texto=cta_label,
                    cc=emails_cc,
                )

        # 4. Trilha de Auditoria Forense Criptográfica (ForensicAuditLog)
        try:
            ForensicAuditService.registrar_evento(
                tipo_evento="SCHEDULE_AGENDAMENTO_CRIADO",
                descricao=f"Reunião de {tipo_nome} '{agendamento.titulo}' agendada para {data_formatada} ({duracao_str})",
                nivel_relevancia=NivelRelevanciaAudit.N2,
                contrato=contrato,
                cliente=cliente,
                usuario=organizador,
                ip_origem=ip_origem,
                user_agent=user_agent,
                dados_payload={
                    "agendamento_id": str(agendamento.id),
                    "titulo": agendamento.titulo,
                    "tipo": agendamento.tipo,
                    "data_inicio": agendamento.data_inicio.isoformat(),
                    "data_fim": agendamento.data_fim.isoformat(),
                    "duracao_minutos": agendamento.duracao_minutos,
                    "pedido_id": pedido.id if pedido else None,
                    "ciclo_id": ciclo.id if ciclo else None,
                    "google_meet_link": meet_link,
                    "total_participantes": agendamento.participantes.count(),
                },
            )
        except Exception as audit_err:
            logger.warning(f"Falha ao registrar ForensicAuditLog na criação do agendamento #{agendamento.id}: {audit_err}")

    @staticmethod
    def _notificar_e_auditar_remarcacao(
        agendamento: Agendamento,
        autor,
        data_anterior,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        pedido = agendamento.pedido
        ciclo = agendamento.ciclo
        cliente = agendamento.cliente
        contrato = pedido.contrato if (pedido and pedido.contrato) else None
        nova_data_formatada = agendamento.data_inicio.strftime("%d/%m/%Y às %H:%M")
        data_ant_formatada = (
            data_anterior.strftime("%d/%m/%Y às %H:%M")
            if hasattr(data_anterior, "strftime")
            else str(data_anterior)
        )
        tipo_nome = agendamento.get_tipo_display()
        meet_link = agendamento.google_meet_link
        meet_info = f"\n• Sala Google Meet: {meet_link}" if meet_link else ""
        chamado_info = f"\n• Chamado Vinculado: {pedido.protocolo} - {pedido.assunto}" if pedido else ""
        cliente_nome = cliente.nome_fantasia or cliente.razao_social or str(cliente)
        url_destino = f"/schedule?agendamento={agendamento.id}"
        cta_url = meet_link if meet_link else url_destino
        cta_label = "Acessar Sala Google Meet" if meet_link else "Ver Agendamento no SHM"

        # 1. Consulta governança
        enviar_email, enviar_in_app, dests_cfg, emails_cc_cfg = (
            NotificacaoConfigService.resolver_destinatarios_evento(
                codigo="SCHEDULE_AGENDAMENTO_REMARCADO",
                pedido=pedido,
                ciclo=ciclo,
                contrato=contrato,
                cliente=cliente,
                autor=autor,
            )
        )

        cfg_obj = NotificacaoConfigService.obter_configuracao("SCHEDULE_AGENDAMENTO_REMARCADO")
        nao_enviar_autor = getattr(cfg_obj, "nao_enviar_autor", True) if cfg_obj else True

        # 2. In-App
        if enviar_in_app:
            usuarios_in_app = set(dests_cfg)
            for part in agendamento.participantes.filter(usuario__isnull=False):
                usuarios_in_app.add(part.usuario)
            if autor and hasattr(autor, "id"):
                usuarios_in_app = {u for u in usuarios_in_app if u.id != autor.id}

            titulo_in_app = f"Reunião Remarcada: {agendamento.titulo}"
            msg_in_app = f"A reunião '{agendamento.titulo}' foi remarcada para {nova_data_formatada} (anterior: {data_ant_formatada}).{meet_info}"
            notifs = [
                Notification(
                    usuario=u,
                    titulo=titulo_in_app,
                    mensagem=msg_in_app,
                    url=url_destino,
                    lida=False,
                )
                for u in usuarios_in_app
            ]
            if notifs:
                Notification.objects.bulk_create(notifs)

        # 3. E-mail
        if enviar_email:
            emails_dest = set()
            for part in agendamento.participantes.all():
                if part.email and "@" in part.email:
                    emails_dest.add(part.email.strip().lower())
            for u in dests_cfg:
                if u.email and "@" in u.email:
                    emails_dest.add(u.email.strip().lower())

            emails_cc = [e.strip().lower() for e in emails_cc_cfg if e and "@" in e]

            if nao_enviar_autor and autor and getattr(autor, "email", None):
                aut_email = autor.email.strip().lower()
                emails_dest.discard(aut_email)
                emails_cc = [e for e in emails_cc if e != aut_email]

            corpo_email = (
                f"Olá,\n\n"
                f"Informamos que o horário da reunião '{agendamento.titulo}' foi alterado na plataforma SHM:\n\n"
                f"• Novo Horário: {nova_data_formatada}\n"
                f"• Horário Anterior: {data_ant_formatada}\n"
                f"• Duração: {agendamento.duracao_minutos} minutos\n"
                f"• Tipo de Reunião: {tipo_nome}\n"
                f"• Cliente: {cliente_nome}"
                f"{chamado_info}"
                f"{meet_info}\n\n"
                f"Acesse o link abaixo para visualizar os dados atualizados na agenda."
            )

            if emails_dest or emails_cc:
                NotificacaoService._enviar_email(
                    destinatarios=list(emails_dest),
                    assunto=f"Reunião Remarcada: {agendamento.titulo} ({nova_data_formatada})",
                    mensagem_texto=corpo_email,
                    url_destino=cta_url,
                    cta_texto=cta_label,
                    cc=emails_cc,
                )

        # 4. Trilha de Auditoria Forense Criptográfica
        try:
            ForensicAuditService.registrar_evento(
                tipo_evento="SCHEDULE_AGENDAMENTO_REMARCADO",
                descricao=f"Reunião '{agendamento.titulo}' remarcada para {nova_data_formatada} (anterior: {data_ant_formatada})",
                nivel_relevancia=NivelRelevanciaAudit.N2,
                contrato=contrato,
                cliente=cliente,
                usuario=autor,
                ip_origem=ip_origem,
                user_agent=user_agent,
                dados_payload={
                    "agendamento_id": str(agendamento.id),
                    "titulo": agendamento.titulo,
                    "data_anterior": data_anterior.isoformat() if hasattr(data_anterior, "isoformat") else str(data_anterior),
                    "nova_data_inicio": agendamento.data_inicio.isoformat(),
                    "nova_data_fim": agendamento.data_fim.isoformat(),
                    "duracao_minutos": agendamento.duracao_minutos,
                    "pedido_id": pedido.id if pedido else None,
                },
            )
        except Exception as audit_err:
            logger.warning(f"Falha ao registrar ForensicAuditLog na remarcação do agendamento #{agendamento.id}: {audit_err}")

    @staticmethod
    def _notificar_e_auditar_cancelamento(
        agendamento: Agendamento,
        autor,
        motivo: str,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        pedido = agendamento.pedido
        ciclo = agendamento.ciclo
        cliente = agendamento.cliente
        contrato = pedido.contrato if (pedido and pedido.contrato) else None
        data_formatada = agendamento.data_inicio.strftime("%d/%m/%Y às %H:%M")
        tipo_nome = agendamento.get_tipo_display()
        chamado_info = f"\n• Chamado Vinculado: {pedido.protocolo} - {pedido.assunto}" if pedido else ""
        cliente_nome = cliente.nome_fantasia or cliente.razao_social or str(cliente)
        motivo_texto = motivo.strip() if motivo else "Não informado"
        url_destino = "/schedule"

        # 1. Consulta governança
        enviar_email, enviar_in_app, dests_cfg, emails_cc_cfg = (
            NotificacaoConfigService.resolver_destinatarios_evento(
                codigo="SCHEDULE_AGENDAMENTO_CANCELADO",
                pedido=pedido,
                ciclo=ciclo,
                contrato=contrato,
                cliente=cliente,
                autor=autor,
            )
        )

        cfg_obj = NotificacaoConfigService.obter_configuracao("SCHEDULE_AGENDAMENTO_CANCELADO")
        nao_enviar_autor = getattr(cfg_obj, "nao_enviar_autor", True) if cfg_obj else True

        # 2. In-App
        if enviar_in_app:
            usuarios_in_app = set(dests_cfg)
            for part in agendamento.participantes.filter(usuario__isnull=False):
                usuarios_in_app.add(part.usuario)
            if autor and hasattr(autor, "id"):
                usuarios_in_app = {u for u in usuarios_in_app if u.id != autor.id}

            titulo_in_app = f"Compromisso Cancelado: {agendamento.titulo}"
            msg_in_app = f"A reunião '{agendamento.titulo}' programada para {data_formatada} foi cancelada. Motivo: {motivo_texto}."
            notifs = [
                Notification(
                    usuario=u,
                    titulo=titulo_in_app,
                    mensagem=msg_in_app,
                    url=url_destino,
                    lida=False,
                )
                for u in usuarios_in_app
            ]
            if notifs:
                Notification.objects.bulk_create(notifs)

        # 3. E-mail
        if enviar_email:
            emails_dest = set()
            for part in agendamento.participantes.all():
                if part.email and "@" in part.email:
                    emails_dest.add(part.email.strip().lower())
            for u in dests_cfg:
                if u.email and "@" in u.email:
                    emails_dest.add(u.email.strip().lower())

            emails_cc = [e.strip().lower() for e in emails_cc_cfg if e and "@" in e]

            if nao_enviar_autor and autor and getattr(autor, "email", None):
                aut_email = autor.email.strip().lower()
                emails_dest.discard(aut_email)
                emails_cc = [e for e in emails_cc if e != aut_email]

            corpo_email = (
                f"Olá,\n\n"
                f"Informamos que a reunião de suporte '{agendamento.titulo}' agendada para {data_formatada} foi cancelada:\n\n"
                f"• Motivo do Cancelamento: {motivo_texto}\n"
                f"• Tipo de Reunião: {tipo_nome}\n"
                f"• Cliente: {cliente_nome}"
                f"{chamado_info}\n\n"
                f"Acesse o portal SHM caso deseje reagendar um novo compromisso."
            )

            if emails_dest or emails_cc:
                NotificacaoService._enviar_email(
                    destinatarios=list(emails_dest),
                    assunto=f"Reunião Cancelada: {agendamento.titulo}",
                    mensagem_texto=corpo_email,
                    url_destino=url_destino,
                    cta_texto="Acessar Agenda SHM",
                    cc=emails_cc,
                )

        # 4. Trilha de Auditoria Forense Criptográfica
        try:
            ForensicAuditService.registrar_evento(
                tipo_evento="SCHEDULE_AGENDAMENTO_CANCELADO",
                descricao=f"Reunião '{agendamento.titulo}' cancelada. Motivo: {motivo_texto}",
                nivel_relevancia=NivelRelevanciaAudit.N2,
                contrato=contrato,
                cliente=cliente,
                usuario=autor,
                justificativa=motivo_texto if len(motivo_texto) >= 10 else None,
                ip_origem=ip_origem,
                user_agent=user_agent,
                dados_payload={
                    "agendamento_id": str(agendamento.id),
                    "titulo": agendamento.titulo,
                    "data_inicio": agendamento.data_inicio.isoformat(),
                    "motivo_cancelamento": motivo_texto,
                    "pedido_id": pedido.id if pedido else None,
                },
            )
        except Exception as audit_err:
            logger.warning(f"Falha ao registrar ForensicAuditLog no cancelamento do agendamento #{agendamento.id}: {audit_err}")

    @staticmethod
    @transaction.atomic
    def criar_agendamento(
        cliente,
        organizador,
        titulo: str,
        data_inicio,
        data_fim=None,
        duracao_minutos: int = 45,
        descricao: str = "",
        tipo: str = TipoEventoSchedule.ALINHAMENTO,
        pedido=None,
        ciclo=None,
        tarefa=None,
        participantes: Optional[List[Dict[str, Any]]] = None,
        sincronizar_google: bool = True,
        google_meet_link: Optional[str] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Agendamento:
        """
        Cria um agendamento no SHM, cadastra os participantes, gera a régua de 3 lembretes,
        registra na timeline forense do pedido, grava na trilha pericial ForensicAuditLog,
        dispara notificações in-app/e-mail e sincroniza com Google Calendar / Meet.
        """
        if not data_fim:
            data_fim = data_inicio + timedelta(minutes=duracao_minutos)

        if pedido and pedido.cliente_id != cliente.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"pedido": "O chamado/pedido selecionado não pertence ao cliente informado."})

        if ciclo and pedido and ciclo.pedido_id != pedido.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"ciclo": "O ciclo informado não pertence ao pedido selecionado."})

        tarefa_inst = tarefa
        if isinstance(tarefa, int):
            from apps.tarefas.models import Tarefa
            tarefa_inst = Tarefa.objects.filter(id=tarefa).first()

        agendamento = Agendamento.objects.create(
            cliente=cliente,
            organizador=organizador,
            titulo=titulo,
            descricao=descricao,
            tipo=tipo,
            status=StatusAgendamento.AGENDADO,
            data_inicio=data_inicio,
            data_fim=data_fim,
            duracao_minutos=duracao_minutos,
            pedido=pedido,
            ciclo=ciclo,
            tarefa=tarefa_inst,
            google_meet_link=google_meet_link.strip() if google_meet_link else None,
        )

        # 1. Cadastrar participantes
        participantes_lista = participantes or []
        # Garante que o organizador esteja entre os participantes
        emails_cadastrados = set()
        for part_data in participantes_lista:
            email = part_data["email"].strip().lower()
            if email in emails_cadastrados:
                continue
            emails_cadastrados.add(email)
            u_inst = part_data.get("usuario")
            if isinstance(u_inst, int):
                from apps.accounts.models import User
                u_inst = User.objects.filter(id=u_inst).first()
            if not u_inst:
                from apps.accounts.models import User
                u_inst = User.objects.filter(email__iexact=email).first()

            ParticipanteAgendamento.objects.create(
                agendamento=agendamento,
                usuario=u_inst,
                nome=part_data.get("nome", email),
                email=email,
                tipo=part_data.get("tipo", TipoParticipante.CLIENTE),
            )

        if organizador and organizador.email and organizador.email.lower() not in emails_cadastrados:
            ParticipanteAgendamento.objects.create(
                agendamento=agendamento,
                usuario=organizador,
                nome=organizador.get_full_name() or organizador.username,
                email=organizador.email.lower(),
                tipo=TipoParticipante.ORGANIZADOR,
            )

        # 2. Gerar Régua de Lembretes (24h, 30m, 15m)
        now = timezone.now()
        marcos_config = [
            (MarcoLembrete.MARCO_24H, timedelta(hours=24)),
            (MarcoLembrete.MARCO_30M, timedelta(minutes=30)),
            (MarcoLembrete.MARCO_15M, timedelta(minutes=15)),
        ]
        for marco, delta in marcos_config:
            prevista = data_inicio - delta
            if prevista > now:
                status_inicial = StatusLembrete.PENDENTE
            elif now < data_inicio and marco == MarcoLembrete.MARCO_15M:
                status_inicial = StatusLembrete.PENDENTE
            else:
                status_inicial = StatusLembrete.IGNORADO

            LembreteAgendamento.objects.create(
                agendamento=agendamento,
                marco=marco,
                data_prevista=prevista,
                status=status_inicial,
            )

        # 3. Registrar TimelineEvent forense se vinculado a pedido
        if pedido:
            try:
                data_formatada = data_inicio.strftime("%d/%m/%Y às %H:%M")
                TimelineEvent.objects.create(
                    pedido=pedido,
                    ciclo=ciclo,
                    agendamento=agendamento,
                    tipo=TipoEventoTimeline.AGENDAMENTO_CRIADO,
                    descricao=f"Reunião de {agendamento.get_tipo_display()} agendada para {data_formatada} ({agendamento.duracao_minutos} min)",
                    autor=organizador,
                    ip_origem=ip_origem,
                    user_agent=user_agent,
                )
            except Exception as e:
                logger.warning(f"Falha ao registrar TimelineEvent para agendamento #{agendamento.id}: {e}")

        # 4. Sincronizar com Google Calendar se requisitado
        if sincronizar_google:
            try:
                google_service = GoogleCalendarService()
                res = google_service.criar_evento(agendamento)
                if res.get("success"):
                    agendamento.google_event_id = res.get("google_event_id")
                    agendamento.google_meet_link = res.get("google_meet_link")
                    agendamento.google_sincronizado = True
                    agendamento.save(update_fields=["google_event_id", "google_meet_link", "google_sincronizado"])
            except Exception as e:
                logger.error(f"Erro ao sincronizar agendamento #{agendamento.id} com Google: {e}")

        # 5. Notificações App/E-mail e Trilha Pericial de Auditoria
        ScheduleService._notificar_e_auditar_criacao(
            agendamento=agendamento,
            organizador=organizador,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        return agendamento

    @staticmethod
    @transaction.atomic
    def atualizar_agendamento(
        agendamento: Agendamento,
        titulo: Optional[str] = None,
        descricao: Optional[str] = None,
        data_inicio=None,
        data_fim=None,
        duracao_minutos: Optional[int] = None,
        google_meet_link: Optional[str] = None,
        autor=None,
        sincronizar_google: bool = True,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Agendamento:
        """
        Atualiza dados do agendamento, recalcula os marcos e propaga para o Google Calendar,
        disparando notificações in-app/e-mail e registrando auditoria forense.
        """
        data_anterior = agendamento.data_inicio
        horario_alterado = False

        if titulo:
            agendamento.titulo = titulo
        if descricao is not None:
            agendamento.descricao = descricao
        if data_inicio:
            if agendamento.data_inicio != data_inicio:
                horario_alterado = True
            agendamento.data_inicio = data_inicio
        if duracao_minutos:
            agendamento.duracao_minutos = duracao_minutos
        if data_fim:
            agendamento.data_fim = data_fim
        elif horario_alterado or (data_inicio and not data_fim):
            agendamento.data_fim = agendamento.data_inicio + timedelta(minutes=agendamento.duracao_minutos)
        if google_meet_link is not None:
            agendamento.google_meet_link = google_meet_link.strip() if google_meet_link else None

        agendamento.save()

        # Recalcular lembretes pendentes se houve mudança de horário
        if horario_alterado:
            now = timezone.now()
            marcos_map = {
                MarcoLembrete.MARCO_24H: timedelta(hours=24),
                MarcoLembrete.MARCO_30M: timedelta(minutes=30),
                MarcoLembrete.MARCO_15M: timedelta(minutes=15),
            }
            for lembrete in agendamento.lembretes.filter(status__in=[StatusLembrete.PENDENTE, StatusLembrete.IGNORADO]):
                delta = marcos_map.get(lembrete.marco)
                if delta:
                    lembrete.data_prevista = agendamento.data_inicio - delta
                    lembrete.status = StatusLembrete.PENDENTE if lembrete.data_prevista > now else StatusLembrete.IGNORADO
                    lembrete.save()

            if agendamento.pedido:
                try:
                    data_formatada = agendamento.data_inicio.strftime("%d/%m/%Y às %H:%M")
                    TimelineEvent.objects.create(
                        pedido=agendamento.pedido,
                        ciclo=agendamento.ciclo,
                        agendamento=agendamento,
                        tipo=TipoEventoTimeline.AGENDAMENTO_REMARCADO,
                        descricao=f"Reunião remarcada para {data_formatada}",
                        autor=autor,
                        ip_origem=ip_origem,
                        user_agent=user_agent,
                    )
                except Exception as e:
                    logger.warning(f"Falha ao registrar TimelineEvent para reagendamento #{agendamento.id}: {e}")

            # Disparo de notificações in-app/e-mail e auditoria pericial de remarcação
            ScheduleService._notificar_e_auditar_remarcacao(
                agendamento=agendamento,
                autor=autor,
                data_anterior=data_anterior,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        else:
            try:
                contrato = agendamento.pedido.contrato if (agendamento.pedido and agendamento.pedido.contrato) else None
                ForensicAuditService.registrar_evento(
                    tipo_evento="SCHEDULE_AGENDAMENTO_ATUALIZADO",
                    descricao=f"Dados do agendamento '{agendamento.titulo}' atualizados",
                    nivel_relevancia=NivelRelevanciaAudit.N2,
                    contrato=contrato,
                    cliente=agendamento.cliente,
                    usuario=autor,
                    ip_origem=ip_origem,
                    user_agent=user_agent,
                    dados_payload={
                        "agendamento_id": str(agendamento.id),
                        "titulo": agendamento.titulo,
                        "duracao_minutos": agendamento.duracao_minutos,
                    },
                )
            except Exception as audit_err:
                logger.warning(f"Falha ao registrar ForensicAuditLog na atualização do agendamento #{agendamento.id}: {audit_err}")

        if sincronizar_google and agendamento.google_sincronizado:
            try:
                GoogleCalendarService().atualizar_evento(agendamento)
            except Exception as e:
                logger.error(f"Erro ao atualizar evento Google #{agendamento.google_event_id}: {e}")

        return agendamento

    @staticmethod
    @transaction.atomic
    def cancelar_agendamento(
        agendamento: Agendamento,
        motivo: str = "",
        autor=None,
        sincronizar_google: bool = True,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Agendamento:
        """
        Cancela um agendamento, invalida lembretes pendentes, remove do Google Calendar,
        dispara notificações in-app e e-mails com o motivo, e registra na trilha forense.
        """
        agendamento.status = StatusAgendamento.CANCELADO
        agendamento.motivo_cancelamento = motivo
        agendamento.save(update_fields=["status", "motivo_cancelamento", "atualizado_em"])

        agendamento.lembretes.filter(status=StatusLembrete.PENDENTE).update(status=StatusLembrete.CANCELADO)

        if agendamento.pedido:
            try:
                TimelineEvent.objects.create(
                    pedido=agendamento.pedido,
                    ciclo=agendamento.ciclo,
                    agendamento=agendamento,
                    tipo=TipoEventoTimeline.AGENDAMENTO_CANCELADO,
                    descricao=f"Reunião '{agendamento.titulo}' cancelada. Motivo: {motivo or 'Não informado'}",
                    autor=autor,
                    ip_origem=ip_origem,
                    user_agent=user_agent,
                )
            except Exception as e:
                logger.warning(f"Falha ao registrar TimelineEvent de cancelamento: {e}")

        if sincronizar_google and agendamento.google_sincronizado:
            try:
                GoogleCalendarService().cancelar_evento(agendamento)
            except Exception as e:
                logger.error(f"Erro ao cancelar evento Google #{agendamento.google_event_id}: {e}")

        # Notificações in-app e e-mail com auditoria pericial
        ScheduleService._notificar_e_auditar_cancelamento(
            agendamento=agendamento,
            autor=autor,
            motivo=motivo,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        return agendamento

    @staticmethod
    def processar_lembretes_pendentes() -> int:
        """
        Varre e dispara lembretes pendentes cujas datas previstas já foram alcançadas.
        Garante idempotência absoluta com select_for_update e dispara notificações in-app e e-mails.
        """
        now = timezone.now()
        lembretes_pendentes = LembreteAgendamento.objects.filter(
            status=StatusLembrete.PENDENTE,
            data_prevista__lte=now,
            agendamento__status=StatusAgendamento.AGENDADO,
        ).select_related("agendamento", "agendamento__cliente", "agendamento__organizador", "agendamento__pedido")

        MAPA_MARCO_CODIGO = {
            MarcoLembrete.MARCO_24H: "SCHEDULE_LEMBRETE_24H",
            MarcoLembrete.MARCO_30M: "SCHEDULE_LEMBRETE_30M",
            MarcoLembrete.MARCO_15M: "SCHEDULE_LEMBRETE_15M",
        }

        total_disparados = 0
        for lembrete in lembretes_pendentes:
            with transaction.atomic():
                l_lock = (
                    LembreteAgendamento.objects.select_for_update()
                    .filter(id=lembrete.id, status=StatusLembrete.PENDENTE)
                    .first()
                )
                if not l_lock:
                    continue

                agendamento = l_lock.agendamento
                # Se a reunião já terminou, marca como ignorado
                if now >= agendamento.data_fim:
                    l_lock.status = StatusLembrete.IGNORADO
                    l_lock.save(update_fields=["status", "atualizado_em"])
                    continue

                codigo_evento = MAPA_MARCO_CODIGO.get(l_lock.marco, "SCHEDULE_LEMBRETE_15M")
                pedido = agendamento.pedido
                cliente = agendamento.cliente
                contrato = pedido.contrato if (pedido and pedido.contrato) else None

                enviar_email, enviar_in_app, dests_cfg, emails_cc_cfg = (
                    NotificacaoConfigService.resolver_destinatarios_evento(
                        codigo=codigo_evento,
                        pedido=pedido,
                        contrato=contrato,
                        cliente=cliente,
                    )
                )

                meet_link = agendamento.google_meet_link
                marco_label = l_lock.get_marco_display()
                texto_meet = f" Acesse a sala do Google Meet: {meet_link}" if meet_link else ""
                url_destino = (
                    meet_link
                    if (l_lock.marco == MarcoLembrete.MARCO_15M and meet_link)
                    else f"/schedule?agendamento={agendamento.id}"
                )
                cta_url = meet_link if meet_link else f"/schedule?agendamento={agendamento.id}"
                cta_label = "Entrar no Google Meet" if meet_link else "Ver na Agenda SHM"

                # 1. Dispara notificações in-app
                if enviar_in_app:
                    usuarios_in_app = set(dests_cfg)
                    for part in agendamento.participantes.filter(usuario__isnull=False):
                        usuarios_in_app.add(part.usuario)

                    notifs = [
                        Notification(
                            usuario=u,
                            titulo=f"Lembrete de Reunião ({marco_label})",
                            mensagem=f"A reunião '{agendamento.titulo}' iniciará em {agendamento.data_inicio.strftime('%H:%M')}.{texto_meet}",
                            url=url_destino,
                            lida=False,
                        )
                        for u in usuarios_in_app
                    ]
                    if notifs:
                        Notification.objects.bulk_create(notifs)

                # 2. Dispara e-mail de lembrete
                if enviar_email:
                    emails_dest = set()
                    for part in agendamento.participantes.all():
                        if part.email and "@" in part.email:
                            emails_dest.add(part.email.strip().lower())
                    for u in dests_cfg:
                        if u.email and "@" in u.email:
                            emails_dest.add(u.email.strip().lower())

                    emails_cc = [e.strip().lower() for e in emails_cc_cfg if e and "@" in e]

                    chamado_info = f"\n• Chamado Vinculado: {pedido.protocolo} - {pedido.assunto}" if pedido else ""
                    meet_email_info = f"\n• Link da Sala Virtual: {meet_link}" if meet_link else ""
                    pauta_info = f"\n• Pauta / Descrição: {agendamento.descricao}" if agendamento.descricao else ""

                    corpo_email = (
                        f"Olá,\n\n"
                        f"Este é um lembrete automático de compromisso de suporte na plataforma SHM ({marco_label}):\n\n"
                        f"• Título: {agendamento.titulo}\n"
                        f"• Início Previsto: {agendamento.data_inicio.strftime('%d/%m/%Y às %H:%M')}\n"
                        f"• Duração: {agendamento.duracao_minutos} minutos\n"
                        f"• Tipo: {agendamento.get_tipo_display()}"
                        f"{chamado_info}"
                        f"{meet_email_info}"
                        f"{pauta_info}\n\n"
                        f"Clique no botão abaixo para acessar a reunião."
                    )

                    if emails_dest or emails_cc:
                        NotificacaoService._enviar_email(
                            destinatarios=list(emails_dest),
                            assunto=f"Lembrete: {agendamento.titulo} ({marco_label})",
                            mensagem_texto=corpo_email,
                            url_destino=cta_url,
                            cta_texto=cta_label,
                            cc=emails_cc,
                        )

                l_lock.status = StatusLembrete.ENVIADO
                l_lock.disparado_em = now
                l_lock.save(update_fields=["status", "disparado_em", "atualizado_em"])
                total_disparados += 1

        return total_disparados
