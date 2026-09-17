import datetime
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.contratos.models import Contrato, StatusContrato, OrigemExtrato
from apps.contratos.pdf_service import ExtratoPdfService
from apps.contratos.email_service import ContratoEmailNotificacaoService
from apps.ciclos.models import Ciclo, StatusCiclo
from apps.saldo.models import HistoricoSaldo

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Processa e envia os Extratos Oficiais mensais em PDF para os contratos com movimentação no período anterior."

    def add_arguments(self, parser):
        parser.add_argument(
            "--mes",
            type=int,
            help="Mês de referência (1-12). Padrão: mês anterior ao atual.",
        )
        parser.add_argument(
            "--ano",
            type=int,
            help="Ano de referência (YYYY). Padrão: ano correspondente ao mês.",
        )
        parser.add_argument(
            "--contrato-id",
            type=int,
            help="Processa apenas um contrato específico pelo ID.",
        )
        parser.add_argument(
            "--forcar",
            action="store_true",
            help="Força o envio mesmo para contratos sem ciclos ou movimentações contábeis no período.",
        )

    def handle(self, *args, **options):
        hoje = timezone.localdate()
        mes = options.get("mes")
        ano = options.get("ano")
        contrato_id = options.get("contrato_id")
        forcar = options.get("forcar", False)

        if not mes:
            # Padrão: mês anterior
            if hoje.month == 1:
                mes = 12
                ano = ano or (hoje.year - 1)
            else:
                mes = hoje.month - 1
                ano = ano or hoje.year
        else:
            ano = ano or hoje.year

        periodo_str = f"{ano:04d}-{mes:02d}"
        self.stdout.write(self.style.NOTICE(f"=== Iniciando Fechamento Mensal de Extratos — Período: {periodo_str} ==="))

        data_inicio_mes = datetime.date(ano, mes, 1)
        if mes == 12:
            data_fim_mes = datetime.date(ano + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            data_fim_mes = datetime.date(ano, mes + 1, 1) - datetime.timedelta(days=1)

        qs = Contrato.objects.filter(status=StatusContrato.ATIVO).select_related("cliente")
        if contrato_id:
            qs = qs.filter(id=contrato_id)

        total_encontrados = qs.count()
        processados = 0
        enviados = 0
        pulados = 0
        falhas = 0

        self.stdout.write(f"Contratos ativos localizados: {total_encontrados}")

        for contrato in qs:
            processados += 1
            # Verifica movimentação contábil ou ciclos aceitos no período
            tem_ciclos = Ciclo.objects.filter(
                pedido__contrato=contrato,
                status=StatusCiclo.ACEITO,
                aceito_em__date__gte=data_inicio_mes,
                aceito_em__date__lte=data_fim_mes,
            ).exists()

            tem_saldo = HistoricoSaldo.objects.filter(
                contrato=contrato,
                criado_em__date__gte=data_inicio_mes,
                criado_em__date__lte=data_fim_mes,
            ).exists()

            if not tem_ciclos and not tem_saldo and not forcar:
                pulados += 1
                self.stdout.write(
                    self.style.WARNING(f"  [PULADO] Contrato {contrato.numero} sem movimentação em {periodo_str}")
                )
                continue

            try:
                self.stdout.write(f"  [GERANDO] Compilando PDF do contrato {contrato.numero}...")
                pdf_bytes, extrato_reg, nome_arquivo = ExtratoPdfService.gerar_extrato_pdf(
                    contrato=contrato,
                    periodo=periodo_str,
                    origem=OrigemExtrato.MENSAL_AUTOMATICO,
                    salvar=True,
                )

                self.stdout.write(f"  [ENVIANDO] Despachando e-mail para contatos do contrato {contrato.numero}...")
                resultado = ContratoEmailNotificacaoService.enviar_extrato_oficial_email(
                    contrato=contrato,
                    extrato_registro=extrato_reg,
                    pdf_bytes=pdf_bytes,
                    destinatarios=None,  # Padrão: todos os elegíveis confirmados
                    mensagem_adicional=f"Fechamento mensal automatizado de prestação de contas referente a {periodo_str}.",
                )

                if resultado.get("sucesso"):
                    enviados += 1
                    qtd = len(resultado.get("destinatarios_enviados", []))
                    self.stdout.write(
                        self.style.SUCCESS(f"  [SUCESSO] Contrato {contrato.numero} enviado para {qtd} destinatário(s).")
                    )
                else:
                    falhas += 1
                    self.stdout.write(
                        self.style.ERROR(f"  [FALHA ENVIO] Contrato {contrato.numero}: {resultado.get('mensagem')}")
                    )

            except Exception as exc:
                falhas += 1
                logger.exception(f"Erro ao processar contrato {contrato.numero} no fechamento mensal: {exc}")
                self.stdout.write(
                    self.style.ERROR(f"  [ERRO] Contrato {contrato.numero}: {exc}")
                )

        self.stdout.write(self.style.NOTICE("=== Resumo do Fechamento Mensal ==="))
        self.stdout.write(f"Processados: {processados}")
        self.stdout.write(self.style.SUCCESS(f"Enviados com sucesso: {enviados}"))
        self.stdout.write(self.style.WARNING(f"Pulados (sem movimentação): {pulados}"))
        if falhas > 0:
            self.stdout.write(self.style.ERROR(f"Falhas: {falhas}"))
        self.stdout.write(self.style.NOTICE("Fechamento concluído com sucesso."))
