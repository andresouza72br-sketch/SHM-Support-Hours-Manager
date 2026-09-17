import json
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    TipoContrato,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    AceiteLink,
)

class ContratoService:
    @staticmethod
    def gerar_numero(ano=None) -> str:
        import re
        ano = ano or timezone.localdate().year
        prefixo = f"CT-{ano}-"
        pattern = re.compile(rf"^{re.escape(prefixo)}(\d+)$")

        ultimo_numero = (
            Contrato.objects.filter(numero__startswith=prefixo)
            .order_by("-numero")
            .values_list("numero", flat=True)
            .first()
        )

        max_seq = 0
        if ultimo_numero:
            match = pattern.match(ultimo_numero)
            if match:
                try:
                    max_seq = int(match.group(1))
                except ValueError:
                    max_seq = 0

        seq = max_seq + 1
        candidato = f"{prefixo}{seq:04d}"
        while Contrato.objects.filter(numero=candidato).exists():
            seq += 1
            candidato = f"{prefixo}{seq:04d}"
        return candidato

    @staticmethod
    @transaction.atomic
    def criar_contrato(dados, usuario, request=None) -> Contrato:
        from rest_framework.exceptions import ValidationError as DRFValidationError

        numero_informado = dados.get("numero")
        if numero_informado and str(numero_informado).strip():
            numero = str(numero_informado).strip().upper()
            if Contrato.objects.filter(numero=numero).exists():
                raise DRFValidationError({"numero": f"Já existe um contrato cadastrado com o número {numero}."})
        else:
            numero = ContratoService.gerar_numero()

        horas = Decimal(str(dados.get("horas_contratadas", "0.00")))
        saldo_inicial = horas

        # Processar emails_notificacao se vier como string JSON
        emails_notificacao = dados.get("emails_notificacao", [])
        if isinstance(emails_notificacao, str):
            try:
                emails_notificacao = json.loads(emails_notificacao)
            except Exception:
                emails_notificacao = []

        def _parse_date(val):
            if not val:
                return None
            if isinstance(val, date):
                return val
            if isinstance(val, str):
                val_clean = val.strip().split("T")[0]
                if not val_clean:
                    return None
                try:
                    return date.fromisoformat(val_clean)
                except (ValueError, TypeError):
                    return None
            return None

        status_informado = dados.get("status", StatusContrato.PENDENTE_ACEITE)
        if not status_informado or status_informado not in StatusContrato.values:
            status_informado = StatusContrato.PENDENTE_ACEITE

        dt_inicio = _parse_date(dados.get("data_inicio")) or timezone.localdate()
        dt_termino = _parse_date(dados.get("data_termino"))
        dt_carencia = _parse_date(dados.get("data_fim_carencia"))

        contrato = Contrato.objects.create(
            numero=numero,
            tipo=dados.get("tipo", TipoContrato.NOVO),
            contrato_referencia_id=dados.get("contrato_referencia") or None,
            cliente_id=dados.get("cliente"),
            data_inicio=dt_inicio,
            data_termino=dt_termino,
            horas_contratadas=horas,
            saldo=saldo_inicial,
            data_fim_carencia=dt_carencia,
            descricao_servicos=dados.get("descricao_servicos", ""),
            valor_mensal=dados.get("valor_mensal") or None,
            dia_faturamento=dados.get("dia_faturamento") or None,
            gestor_nome=dados.get("gestor_nome", ""),
            gestor_email=dados.get("gestor_email", ""),
            gestor_telefone=dados.get("gestor_telefone", ""),
            emails_notificacao=emails_notificacao,
            observacoes=dados.get("observacoes", ""),
            status=status_informado,
            criado_por=usuario,
        )

        from apps.core.utils import get_client_ip, get_client_user_agent
        ip = get_client_ip(request) if request else ""
        ua = get_client_user_agent(request) if request else ""

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CRIACAO,
            descricao=f"Contrato {contrato.numero} cadastrado no sistema por {usuario.get_full_name() or usuario.username} com franquia de {horas:.1f}h.",
            usuario=usuario,
            ip_origem=ip,
            user_agent=ua,
        )

        # 1. Executar migração de saldo remanescente se solicitado (atômico)
        from apps.saldo.services import SaldoService

        resgatar_id = dados.get("resgatar_saldo_contrato_id")
        resgatar_horas = dados.get("resgatar_saldo_horas")
        if resgatar_id and resgatar_horas and float(resgatar_horas) > 0:
            try:
                SaldoService.migrar_saldo_contratos_vencidos(
                    contrato_origem_id=int(resgatar_id),
                    contrato_destino_id=contrato.id,
                    quantidade=Decimal(str(resgatar_horas)),
                    autor=usuario,
                    motivo=f"Aproveitamento e resgate de saldo remanescente na abertura do contrato {contrato.numero}",
                    ip_origem=ip,
                    user_agent=ua,
                )
                contrato.refresh_from_db()
            except Exception as migra_err:
                import logging
                logging.getLogger(__name__).error(f"Erro ao migrar saldo na abertura: {migra_err}", exc_info=True)

        # 2. Executar compensação de saldo devedor se solicitado (atômico)
        compensar_id = dados.get("compensar_debito_contrato_id")
        compensar_horas = dados.get("compensar_debito_horas")
        if compensar_id and compensar_horas and float(compensar_horas) > 0:
            try:
                SaldoService.compensar_debito_contrato_anterior(
                    contrato_novo_id=contrato.id,
                    contrato_devedor_id=int(compensar_id),
                    quantidade=Decimal(str(compensar_horas)),
                    autor=usuario,
                    motivo=f"Compensação e quitação de saldo devedor na abertura do contrato {contrato.numero}",
                    ip_origem=ip,
                    user_agent=ua,
                )
                contrato.refresh_from_db()
            except Exception as comp_err:
                import logging
                logging.getLogger(__name__).error(f"Erro ao compensar débito na abertura: {comp_err}", exc_info=True)

        aceite_link = AceiteLink.objects.create(
            contrato=contrato,
            data_expiracao=timezone.now() + timedelta(days=30),
        )

        from apps.contratos.email_service import ContratoEmailNotificacaoService

        # Disparar e-mail de formalização de aceite e início dos trabalhos para o responsável
        ContratoEmailNotificacaoService.enviar_email_aceite_contrato(
            contrato=contrato,
            aceite_link=aceite_link,
            request=request,
        )

        # Sincronizar e enviar e-mails de confirmação de lista de notificações com validade de 15 dias
        if emails_notificacao and isinstance(emails_notificacao, list):
            ContratoEmailNotificacaoService.sincronizar_destinatarios_contrato(
                contrato=contrato,
                lista_emails=emails_notificacao,
                usuario_solicitante=usuario,
                request=request,
            )

        contrato.refresh_from_db()
        return contrato

    @staticmethod
    def notificar_e_auditar_migracao_saldo(
        contrato_origem: Contrato,
        contrato_destino: Contrato,
        quantidade: Decimal,
        autor,
        motivo: str,
        ip_origem: str = None,
        user_agent: str = None,
    ):
        import logging
        logger = logging.getLogger(__name__)
        usuario_str = (autor.get_full_name() or autor.username) if autor else "Administrador"

        ContratoAuditLog.objects.create(
            contrato=contrato_origem,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Migração/aproveitamento de {quantidade:.2f}h para o contrato {contrato_destino.numero} formalizada por {usuario_str}.",
            justificativa=motivo,
            usuario=autor,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        ContratoAuditLog.objects.create(
            contrato=contrato_destino,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Recebimento de migração/aproveitamento de {quantidade:.2f}h do contrato encerrado {contrato_origem.numero} formalizada por {usuario_str}.",
            justificativa=motivo,
            usuario=autor,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        try:
            from apps.contratos.forensic_service import ForensicAuditService
            from apps.contratos.models import NivelRelevanciaAudit
            ForensicAuditService.registrar_evento(
                tipo_evento="SALDO_MIGRACAO_ENVIO",
                descricao=f"Migração de {quantidade:.2f}h para o contrato {contrato_destino.numero} formalizada por {usuario_str}.",
                nivel_relevancia=NivelRelevanciaAudit.N1,
                contrato=contrato_origem,
                usuario=autor,
                justificativa=motivo,
                dados_payload={"quantidade": quantidade, "destino_id": contrato_destino.id, "destino_numero": contrato_destino.numero},
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            ForensicAuditService.registrar_evento(
                tipo_evento="SALDO_MIGRACAO_RECEBIMENTO",
                descricao=f"Recebimento de {quantidade:.2f}h do contrato encerrado {contrato_origem.numero} formalizada por {usuario_str}.",
                nivel_relevancia=NivelRelevanciaAudit.N1,
                contrato=contrato_destino,
                usuario=autor,
                justificativa=motivo,
                dados_payload={"quantidade": quantidade, "origem_id": contrato_origem.id, "origem_numero": contrato_origem.numero},
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception as f_err:
            logger.warning("Falha ao registrar auditoria forense na migração: %s", f_err)

        try:
            from apps.contratos.email_service import ContratoEmailNotificacaoService
            ContratoEmailNotificacaoService.enviar_email_migracao_saldo(
                contrato_origem=contrato_origem,
                contrato_destino=contrato_destino,
                quantidade=quantidade,
                autor=autor,
                motivo=motivo,
            )
        except Exception as exc:
            logger.warning(
                "Falha ao enviar e-mail de migração de saldo (%s -> %s): %s",
                contrato_origem.numero,
                contrato_destino.numero,
                exc,
                exc_info=True,
            )

        try:
            from apps.notificacoes.config_service import NotificacaoConfigService
            from apps.notificacoes.models import Notification

            cli = contrato_origem.cliente or contrato_destino.cliente
            _, enviar_in_app, dest_users, _ = NotificacaoConfigService.resolver_destinatarios_evento(
                codigo="CONTRATO_MIGRACAO_SALDO",
                contrato=contrato_destino,
                cliente=cli,
                autor=autor,
            )

            if enviar_in_app and dest_users:
                dest_in_app = [u for u in dest_users if not (autor and hasattr(autor, "id") and u.id == autor.id)]
                notifs = [
                    Notification(
                        usuario=u,
                        titulo=f"⚡ Aproveitamento de Saldo: {quantidade:.1f}h",
                        mensagem=f"{quantidade:.1f}h do contrato encerrado {contrato_origem.numero} foram aproveitadas no contrato {contrato_destino.numero}.",
                        url=f"/contratos/{contrato_destino.id}/extrato",
                    )
                    for u in dest_in_app
                ]
                if notifs:
                    Notification.objects.bulk_create(notifs)
        except Exception as exc:
            logger.warning(
                "Falha ao criar notificações in-app de migração de saldo (%s -> %s): %s",
                contrato_origem.numero,
                contrato_destino.numero,
                exc,
                exc_info=True,
            )

    @staticmethod
    def notificar_e_auditar_compensacao_debito(
        contrato_novo: Contrato,
        contrato_devedor: Contrato,
        quantidade: Decimal,
        autor,
        motivo: str,
        ip_origem: str = "",
        user_agent: str = "",
    ):
        import logging
        logger = logging.getLogger(__name__)
        usuario_str = (autor.get_full_name() or autor.username) if autor else "Administrador"

        ContratoAuditLog.objects.create(
            contrato=contrato_novo,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Abatimento de {quantidade:.2f}h da franquia inicial para quitação de saldo devedor do contrato {contrato_devedor.numero} por {usuario_str}.",
            justificativa=motivo,
            usuario=autor,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        ContratoAuditLog.objects.create(
            contrato=contrato_devedor,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Quitação de saldo devedor de {quantidade:.2f}h através de compensação de horas do novo contrato {contrato_novo.numero} por {usuario_str}.",
            justificativa=motivo,
            usuario=autor,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        try:
            from apps.contratos.forensic_service import ForensicAuditService
            from apps.contratos.models import NivelRelevanciaAudit
            ForensicAuditService.registrar_evento(
                tipo_evento="SALDO_COMPENSACAO_ABATIMENTO",
                descricao=f"Abatimento de {quantidade:.2f}h da franquia inicial para quitação de saldo devedor do contrato {contrato_devedor.numero} por {usuario_str}.",
                nivel_relevancia=NivelRelevanciaAudit.N1,
                contrato=contrato_novo,
                usuario=autor,
                justificativa=motivo,
                dados_payload={"quantidade": quantidade, "contrato_devedor_id": contrato_devedor.id, "contrato_devedor_numero": contrato_devedor.numero},
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            ForensicAuditService.registrar_evento(
                tipo_evento="SALDO_COMPENSACAO_QUITACAO",
                descricao=f"Quitação de saldo devedor de {quantidade:.2f}h através de compensação de horas do novo contrato {contrato_novo.numero} por {usuario_str}.",
                nivel_relevancia=NivelRelevanciaAudit.N1,
                contrato=contrato_devedor,
                usuario=autor,
                justificativa=motivo,
                dados_payload={"quantidade": quantidade, "contrato_novo_id": contrato_novo.id, "contrato_novo_numero": contrato_novo.numero},
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception as f_err:
            logger.warning("Falha ao registrar auditoria forense na compensação: %s", f_err)

        try:
            from apps.contratos.email_service import ContratoEmailNotificacaoService
            ContratoEmailNotificacaoService.enviar_email_compensacao_debito(
                contrato_novo=contrato_novo,
                contrato_devedor=contrato_devedor,
                quantidade=quantidade,
                autor=autor,
                motivo=motivo,
            )
        except Exception as exc:
            logger.warning(
                "Falha ao enviar e-mail de compensação de débito (%s -> %s): %s",
                contrato_novo.numero,
                contrato_devedor.numero,
                exc,
                exc_info=True,
            )

        try:
            from apps.notificacoes.config_service import NotificacaoConfigService
            from apps.notificacoes.models import Notification

            cli = contrato_novo.cliente or contrato_devedor.cliente
            _, enviar_in_app, dest_users, _ = NotificacaoConfigService.resolver_destinatarios_evento(
                codigo="CONTRATO_COMPENSACAO_DEBITO",
                contrato=contrato_novo,
                cliente=cli,
                autor=autor,
            )

            if enviar_in_app and dest_users:
                dest_in_app = [u for u in dest_users if not (autor and hasattr(autor, "id") and u.id == autor.id)]
                notifs = [
                    Notification(
                        usuario=u,
                        titulo=f"⚖️ Compensação de Débito: {quantidade:.1f}h",
                        mensagem=f"{quantidade:.1f}h foram abatidas do contrato {contrato_novo.numero} para quitação de saldo devedor do contrato {contrato_devedor.numero}.",
                        url=f"/contratos/{contrato_novo.id}/extrato",
                    )
                    for u in dest_in_app
                ]
                if notifs:
                    Notification.objects.bulk_create(notifs)
        except Exception as exc:
            logger.warning(
                "Falha ao criar notificações in-app de compensação de débito (%s -> %s): %s",
                contrato_novo.numero,
                contrato_devedor.numero,
                exc,
                exc_info=True,
            )

    @staticmethod
    @transaction.atomic
    def formalizar_aceite(token: str, ip: str = "", ua: str = "", request=None) -> dict:
        """
        Formaliza o aceite eletrônico de um contrato via Magic Link.
        Valida integridade do token, vigência, idempotência de uso único,
        transita o contrato para ATIVO, registra auditoria forense e
        dispara notificações in-app e e-mails de formalização.
        """
        from apps.contratos.models import AceiteLink, StatusContrato, ContratoAuditLog, TipoEventoContratoAudit
        from apps.notificacoes.models import Notification
        from apps.accounts.models import User, UserRole
        from apps.contratos.email_service import ContratoEmailNotificacaoService

        link = AceiteLink.objects.select_related("contrato__cliente").filter(token=token).first()
        if not link:
            return {"sucesso": False, "codigo": "token_invalido", "mensagem": "Token de aceite não encontrado."}

        if link.usado:
            data_formatada = link.usado_em.strftime("%d/%m/%Y às %H:%M") if link.usado_em else "data anterior"
            return {
                "sucesso": False,
                "codigo": "ja_usado",
                "mensagem": f"Este contrato já teve o seu aceite formalizado em {data_formatada}.",
            }

        if timezone.now() > link.data_expiracao:
            data_expira = link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
            return {
                "sucesso": False,
                "codigo": "expirado",
                "mensagem": f"O prazo de aceite eletrônico deste contrato expirou em {data_expira} (validade de 30 dias).",
            }

        agora = timezone.now()

        # Marcação de uso único (Idempotência)
        link.usado = True
        link.usado_em = agora
        link.usado_ip = ip
        link.usado_user_agent = ua
        link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        contrato = link.contrato
        contrato.status = StatusContrato.ATIVO
        contrato.data_aceite = agora
        contrato.save(update_fields=["status", "data_aceite", "atualizado_em"])

        # Registro de Auditoria Forense do Aceite
        gestor_info = contrato.gestor_nome or "Responsável pelo Contrato"
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ACEITE,
            descricao=(
                f"Aceite eletrônico do contrato {contrato.numero} formalizado com sucesso por '{gestor_info}' "
                f"via Magic Link. Início dos trabalhos e uso da franquia de {contrato.horas_contratadas:.1f}h autorizados."
            ),
            ip_origem=ip,
            user_agent=ua,
        )

        # Notificações no sistema para a equipe da empresa e clientes conforme governança
        from apps.notificacoes.config_service import NotificacaoConfigService
        _, enviar_in_app, dest_users, _ = NotificacaoConfigService.resolver_destinatarios_evento(
            codigo="CONTRATO_ATIVADO",
            contrato=contrato,
            cliente=contrato.cliente,
        )

        if enviar_in_app and dest_users:
            notifs = [
                Notification(
                    usuario=u,
                    titulo=f"Contrato Ativado: {contrato.numero} — {contrato.cliente.display_name}",
                    mensagem=f"O responsável formalizou o aceite do Contrato {contrato.numero}. Início dos trabalhos e uso do sistema liberados.",
                    url=f"/contratos/{contrato.id}/extrato",
                    lida=False,
                )
                for u in dest_users
            ]
            if notifs:
                Notification.objects.bulk_create(notifs)

        # Disparo de e-mail de aviso de contrato ativado para toda a Empresa e e-mails de notificação listados
        try:
            ContratoEmailNotificacaoService.enviar_email_contrato_ativado(contrato, request=request)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Falha ao enviar e-mail de contrato ativado (%s): %s",
                contrato.numero,
                exc,
                exc_info=True,
            )

        return {
            "sucesso": True,
            "contrato": contrato,
            "contrato_numero": contrato.numero,
            "cliente_nome": contrato.cliente.display_name if contrato.cliente else "Cliente",
            "data_aceite": contrato.data_aceite.isoformat(),
            "ip_origem": ip,
        }

    @staticmethod
    def obter_dados_extrato(contrato: Contrato) -> dict:
        """
        Retorna os dados consolidados de extrato do contrato:
        histórico de ciclos aceitos e apuração/conciliação financeira de saldo.
        """
        from apps.ciclos.models import Ciclo, StatusCiclo
        from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
        from django.db.models import Sum

        ciclos_aceitos = (
            Ciclo.objects.filter(pedido__contrato=contrato, status=StatusCiclo.ACEITO)
            .select_related("pedido")
            .order_by("-aceito_em")
        )

        ciclos_data = [
            {
                "id": c.id,
                "pedido_protocolo": c.pedido.protocolo,
                "tipo": c.get_tipo_display(),
                "contexto": c.contexto,
                "horas_realizadas": float(c.horas_realizadas),
                "aceito_em": c.aceito_em,
            }
            for c in ciclos_aceitos
        ]

        qs_saldo = HistoricoSaldo.objects.filter(contrato=contrato)
        creditos_migrados = float(
            qs_saldo.filter(
                tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_RECEBIMENTO
            ).aggregate(total=Sum("quantidade"))["total"]
            or 0
        )
        debitos_compensados = float(
            abs(qs_saldo.filter(tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_ENVIO).aggregate(total=Sum("quantidade"))["total"] or 0)
        )

        conciliacao = {
            "franquia_contratada": float(contrato.horas_contratadas),
            "creditos_migrados": creditos_migrados,
            "debitos_compensados": debitos_compensados,
            "consumo_acumulado": float(contrato.horas_consumidas),
            "saldo_disponivel": float(contrato.saldo),
            "tem_ajustes": bool(creditos_migrados > 0 or debitos_compensados > 0),
        }

        # Raio-X em Tempo Real: Apuração de Demandas em Andamento e Compromissos Contratuais
        from apps.pedidos.models import Pedido, StatusPedido
        from apps.accounts.models import User, UserRole

        # Identificar o Gestor / Gerente do Cliente com autoridade de aprovação e homologação
        nome_cliente_gerente = (contrato.gestor_nome or "").strip()
        if not nome_cliente_gerente:
            gerente_user = User.objects.filter(
                cliente=contrato.cliente,
                role=UserRole.CLIENTE_GERENTE,
                is_active=True,
            ).first()
            if gerente_user:
                nome_cliente_gerente = (gerente_user.get_full_name() or gerente_user.username).strip()
        if not nome_cliente_gerente:
            nome_cliente_gerente = "Cliente Gerente"

        ciclos_em_andamento = (
            Ciclo.objects.filter(pedido__contrato=contrato)
            .exclude(status__in=[StatusCiclo.ACEITO, StatusCiclo.CANCELADO])
            .select_related("pedido", "operador")
            .order_by("criado_em")
        )

        demandas_aguardando_orcamento = []
        demandas_em_execucao = []
        demandas_aguardando_entrega = []

        for c in ciclos_em_andamento:
            nome_operador = (c.operador.get_full_name() or c.operador.username) if c.operador else "Equipe Técnica"

            # Seleção inteligente das horas a comprometer e do responsável que detém a ação no fluxo
            if c.status in [StatusCiclo.ORCADO, StatusCiclo.AGUARDANDO_APROVACAO]:
                horas_c = float(c.horas_estimadas) if float(c.horas_estimadas) > 0 else float(c.horas_realizadas)
                dest_list = demandas_aguardando_orcamento
                responsavel_nome = nome_cliente_gerente
                responsavel_papel = "cliente"
            elif c.status in [StatusCiclo.APROVADO, StatusCiclo.EM_EXECUCAO]:
                horas_c = float(c.horas_estimadas) if float(c.horas_estimadas) > 0 else float(c.horas_realizadas)
                dest_list = demandas_em_execucao
                responsavel_nome = nome_operador
                responsavel_papel = "tecnico"
            elif c.status == StatusCiclo.AGUARDANDO_ACEITE:
                horas_c = float(c.horas_realizadas) if float(c.horas_realizadas) > 0 else float(c.horas_estimadas)
                dest_list = demandas_aguardando_entrega
                responsavel_nome = nome_cliente_gerente
                responsavel_papel = "cliente"
            else:
                horas_c = float(c.horas_realizadas) or float(c.horas_estimadas)
                dest_list = demandas_em_execucao
                responsavel_nome = nome_operador
                responsavel_papel = "tecnico"

            responsavel_formatado = f"{responsavel_nome} ({'Cliente' if responsavel_papel == 'cliente' else 'Técnico'})"

            dest_list.append({
                "id": c.id,
                "pedido_id": c.pedido.id,
                "pedido_protocolo": c.pedido.protocolo,
                "pedido_assunto": c.pedido.assunto,
                "tipo": c.get_tipo_display(),
                "contexto": c.contexto or c.pedido.assunto,
                "status": c.status,
                "status_display": c.get_status_display(),
                "horas": round(horas_c, 2),
                "horas_estimadas": float(c.horas_estimadas),
                "horas_realizadas": float(c.horas_realizadas),
                "data_referencia": c.apresentado_em or c.criado_em,
                "operador": nome_operador,
                "responsavel": responsavel_formatado,
                "responsavel_nome": responsavel_nome,
                "responsavel_papel": responsavel_papel,
            })

        # Incluir pedidos abertos/em orçamento sem ciclos cadastrados (garantia de rastreabilidade 100%)
        pedidos_sem_ciclos = (
            Pedido.objects.filter(contrato=contrato, ciclos__isnull=True)
            .exclude(status__in=[StatusPedido.CONCLUIDO, StatusPedido.CANCELADO])
            .select_related("criado_por")
        )
        for p in pedidos_sem_ciclos:
            nome_criador = (p.criado_por.get_full_name() or p.criado_por.username) if p.criado_por else "Equipe Técnica"
            if p.status in [StatusPedido.AGUARDANDO_APROVACAO, StatusPedido.AGUARDANDO_ACEITE]:
                responsavel_nome = nome_cliente_gerente
                responsavel_papel = "cliente"
            else:
                responsavel_nome = nome_criador
                responsavel_papel = "tecnico"

            responsavel_formatado = f"{responsavel_nome} ({'Cliente' if responsavel_papel == 'cliente' else 'Técnico'})"

            item_p = {
                "id": f"ped-{p.id}",
                "pedido_id": p.id,
                "pedido_protocolo": p.protocolo,
                "pedido_assunto": p.assunto,
                "tipo": "Demanda Inicial",
                "contexto": p.descricao[:80] if p.descricao else p.assunto,
                "status": p.status,
                "status_display": p.get_status_display(),
                "horas": 0.0,
                "horas_estimadas": 0.0,
                "horas_realizadas": 0.0,
                "data_referencia": p.criado_em,
                "operador": nome_criador,
                "responsavel": responsavel_formatado,
                "responsavel_nome": responsavel_nome,
                "responsavel_papel": responsavel_papel,
            }
            if p.status in [StatusPedido.ABERTO, StatusPedido.EM_ORCAMENTO, StatusPedido.AGUARDANDO_APROVACAO]:
                demandas_aguardando_orcamento.append(item_p)
            elif p.status == StatusPedido.EM_EXECUCAO:
                demandas_em_execucao.append(item_p)
            elif p.status == StatusPedido.AGUARDANDO_ACEITE:
                demandas_aguardando_entrega.append(item_p)

        horas_pendentes_orcamento = round(sum(d["horas"] for d in demandas_aguardando_orcamento), 2)
        horas_em_execucao = round(sum(d["horas"] for d in demandas_em_execucao), 2)
        horas_pendentes_entrega = round(sum(d["horas"] for d in demandas_aguardando_entrega), 2)
        total_horas_comprometidas = round(horas_pendentes_orcamento + horas_em_execucao + horas_pendentes_entrega, 2)

        saldo_atual = float(contrato.saldo)
        saldo_projetado = round(saldo_atual - total_horas_comprometidas, 2)
        previsao_estouro = bool(saldo_projetado < 0)
        horas_estouro = round(abs(saldo_projetado), 2) if previsao_estouro else 0.0

        projecao_saldo = {
            "saldo_atual": saldo_atual,
            "horas_pendentes_orcamento": horas_pendentes_orcamento,
            "horas_em_execucao": horas_em_execucao,
            "horas_pendentes_entrega": horas_pendentes_entrega,
            "total_horas_comprometidas": total_horas_comprometidas,
            "saldo_projetado": saldo_projetado,
            "previsao_estouro": previsao_estouro,
            "horas_estouro": horas_estouro,
        }

        return {
            "historico_ciclos": ciclos_data,
            "conciliacao": conciliacao,
            "projecao_saldo": projecao_saldo,
            "demandas_em_andamento": {
                "aguardando_orcamento": demandas_aguardando_orcamento,
                "em_execucao": demandas_em_execucao,
                "aguardando_entrega": demandas_aguardando_entrega,
                "todas": demandas_aguardando_orcamento + demandas_em_execucao + demandas_aguardando_entrega,
                "total_demandas": len(demandas_aguardando_orcamento) + len(demandas_em_execucao) + len(demandas_aguardando_entrega),
            },
        }


class ContratoDocumentoService:
    @staticmethod
    @transaction.atomic
    def adicionar_documento(
        contrato: Contrato,
        arquivo,
        tipo_doc: str,
        usuario,
        ip: str = "",
        ua: str = "",
    ) -> ContratoDocumento:
        from rest_framework.exceptions import ValidationError
        from apps.core.utils import calcular_hash_sha256
        from apps.contratos.models import TipoDocumentoContrato

        if contrato.documentos.count() >= 5:
            raise ValidationError(
                {"detail": "Limite máximo de 5 documentos por contrato atingido. Remova um documento existente antes de adicionar outro."}
            )

        if not arquivo:
            raise ValidationError({"arquivo": "Nenhum arquivo enviado."})

        if arquivo.size > 25 * 1024 * 1024:
            raise ValidationError({"arquivo": "O arquivo excede o limite máximo permitido de 25MB."})

        if tipo_doc not in TipoDocumentoContrato.values:
            tipo_doc = TipoDocumentoContrato.OUTRO

        nome_original = getattr(arquivo, "name", "documento")
        from apps.contratos.models import EXTENSOES_PERMITIDAS_DOCUMENTO
        import os
        extensao = os.path.splitext(nome_original)[1].lower().lstrip(".")
        if extensao not in EXTENSOES_PERMITIDAS_DOCUMENTO:
            exts_formatadas = ", ".join(f".{e}" for e in sorted(EXTENSOES_PERMITIDAS_DOCUMENTO))
            raise ValidationError({
                "arquivo": f"Extensão de arquivo '.{extensao}' não permitida. Extensões aceitas: {exts_formatadas}."
            })

        hash_sha256 = calcular_hash_sha256(arquivo)

        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            arquivo=arquivo,
            nome_original=nome_original,
            tipo_documento=tipo_doc,
            tamanho_bytes=arquivo.size,
            hash_sha256=hash_sha256,
            algoritmo_hash="SHA-256",
            enviado_por=usuario,
        )

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.UPLOAD_DOCUMENTO,
            descricao=f"Upload do documento '{nome_original}' ({doc.get_tipo_documento_display()}) realizado por {usuario.get_full_name() or usuario.username}.",
            documento_nome=nome_original,
            documento_hash=hash_sha256,
            usuario=usuario,
            ip_origem=ip,
            user_agent=ua,
        )
        return doc

    @staticmethod
    @transaction.atomic
    def excluir_documento(
        doc: ContratoDocumento,
        justificativa: str,
        usuario,
        ip: str = "",
        ua: str = "",
    ) -> dict:
        nome = doc.nome_original
        tipo_disp = doc.get_tipo_documento_display()
        doc_hash = doc.hash_sha256
        contrato = doc.contrato

        if doc.arquivo:
            try:
                doc.arquivo.delete(save=False)
            except Exception:
                pass
        doc.delete()

        usuario_str = usuario.get_full_name() or usuario.username
        role_str = usuario.get_role_display() if hasattr(usuario, "get_role_display") else ""

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.EXCLUSAO_DOCUMENTO,
            descricao=f"Documento '{nome}' ({tipo_disp}) excluído por {usuario_str} ({role_str}). Motivo: {justificativa}",
            justificativa=justificativa,
            documento_nome=nome,
            documento_hash=doc_hash,
            usuario=usuario,
            ip_origem=ip,
            user_agent=ua,
        )
        return {"nome": nome, "hash": doc_hash, "justificativa": justificativa}

    @staticmethod
    def verificar_integridade(doc: ContratoDocumento) -> dict:
        from apps.core.utils import calcular_hash_sha256

        if not doc.arquivo:
            return {
                "sucesso": False,
                "status_code": 404,
                "payload": {
                    "doc_id": doc.id,
                    "nome_original": doc.nome_original,
                    "integro": False,
                    "hash_registrado": doc.hash_sha256,
                    "hash_calculado": "",
                    "algoritmo": doc.algoritmo_hash or "SHA-256",
                    "mensagem": "Arquivo físico não encontrado no storage.",
                    "verificado_em": timezone.now().isoformat(),
                },
            }

        try:
            hash_calculado = calcular_hash_sha256(doc.arquivo)
        except Exception as e:
            return {
                "sucesso": False,
                "status_code": 500,
                "payload": {
                    "doc_id": doc.id,
                    "nome_original": doc.nome_original,
                    "integro": False,
                    "hash_registrado": doc.hash_sha256,
                    "hash_calculado": "",
                    "algoritmo": doc.algoritmo_hash or "SHA-256",
                    "mensagem": f"Erro ao acessar arquivo no storage: {str(e)}",
                    "verificado_em": timezone.now().isoformat(),
                },
            }

        if not doc.hash_sha256:
            doc.hash_sha256 = hash_calculado
            doc.save(update_fields=["hash_sha256"])

        integro = bool(hash_calculado and hash_calculado == doc.hash_sha256)

        return {
            "sucesso": True,
            "status_code": 200,
            "payload": {
                "doc_id": doc.id,
                "nome_original": doc.nome_original,
                "integro": integro,
                "hash_registrado": doc.hash_sha256,
                "hash_calculado": hash_calculado,
                "algoritmo": doc.algoritmo_hash or "SHA-256",
                "tamanho_bytes": doc.tamanho_bytes,
                "mensagem": "Arquivo 100% íntegro e autêntico em conformidade com o hash criptográfico." if integro else "Atenção: O arquivo físico no storage não corresponde ao hash criptográfico original registrado!",
                "verificado_em": timezone.now().isoformat(),
            },
        }