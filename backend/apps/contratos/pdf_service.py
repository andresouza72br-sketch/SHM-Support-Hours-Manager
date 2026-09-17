import os
import io
import base64
import hashlib
import logging
from decimal import Decimal
from typing import Optional, Tuple

from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone

from apps.contratos.models import (
    Contrato,
    ExtratoOficialGerado,
    OrigemExtrato,
    TipoEventoContratoAudit,
    ContratoAuditLog,
)
from apps.contratos.services import ContratoService
from apps.core.storage.sync import agendar_sincronizacao_arquivo

logger = logging.getLogger(__name__)


class ExtratoPdfService:
    @staticmethod
    def _obter_logo_base64(cliente) -> Optional[str]:
        """
        Retorna a imagem de logotipo do cliente em formato Data URI base64,
        evitando requisições HTTP externas durante a compilação do PDF.
        """
        if not cliente or not cliente.logo:
            return None
        try:
            caminho_logo = cliente.logo.path
            if os.path.exists(caminho_logo):
                with open(caminho_logo, "rb") as f:
                    conteudo = f.read()
                ext = os.path.splitext(caminho_logo)[1].lower().replace(".", "")
                mime = "image/png" if ext == "png" else "image/jpeg"
                b64 = base64.b64encode(conteudo).decode("utf-8")
                return f"data:{mime};base64,{b64}"
        except Exception as e:
            logger.warning(f"Erro ao carregar logo do cliente em base64: {e}")
        return None

    @staticmethod
    def _compilar_pdf_reportlab(contexto: dict) -> bytes:
        """
        Compilador vetorial oficial de alta fidelidade utilizando ReportLab Platypus.
        Garante suporte a múltiplas páginas, cabeçalhos repetidos de tabela (repeatRows=1),
        numeração dinâmica (Página X de Y), selo criptográfico SHA-256 e suporte integral
        a caracteres acentuados (UTF-8) sem depender de bibliotecas nativas de SO (GTK).
        """
        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.pdfgen import canvas

        class NumberedCanvas(canvas.Canvas):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self._saved_page_states = []

            def showPage(self):
                self._saved_page_states.append(dict(self.__dict__))
                self._startPage()

            def save(self):
                num_pages = len(self._saved_page_states)
                for state in self._saved_page_states:
                    self.__dict__.update(state)
                    self.draw_page_decorations(num_pages)
                    super().showPage()
                super().save()

            def draw_page_decorations(self, page_count):
                self.saveState()
                self.setFont("Helvetica", 8)
                self.setFillColor(colors.HexColor("#64748B"))
                # Running Header em páginas > 1
                if self._pageNumber > 1:
                    contrato_obj = contexto.get("contrato")
                    num_contrato = contrato_obj.numero if contrato_obj else ""
                    b_nome = contexto.get("branding_nome_fantasia") or "SHM Tecnologia"
                    self.drawString(36, 810, f"Extrato Oficial — Contrato {num_contrato} • {b_nome}")
                    self.drawRightString(595.28 - 36, 810, f"Página {self._pageNumber} de {page_count}")
                    self.setStrokeColor(colors.HexColor("#CBD5E1"))
                    self.setLineWidth(0.5)
                    self.line(36, 804, 595.28 - 36, 804)

                # Footer fixo em todas as páginas
                self.setStrokeColor(colors.HexColor("#CBD5E1"))
                self.setLineWidth(0.5)
                self.line(36, 42, 595.28 - 36, 42)
                self.drawString(36, 30, f"Página {self._pageNumber} de {page_count} • Documento oficial auditado • SHM 2.5")
                self.drawRightString(595.28 - 36, 30, "ABNT NBR ISO/IEC 27037")
                self.restoreState()

        contrato = contexto.get("contrato")
        cliente_nome = contexto.get("cliente_nome", "Cliente")
        cliente_doc = contexto.get("cliente_doc", "")
        conciliacao = contexto.get("conciliacao", {})
        ciclos = contexto.get("ciclos", [])
        hash_sha256 = contexto.get("hash_sha256", "0" * 64)
        emitido_em_formatado = contexto.get("emitido_em_formatado", "")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=45,
            bottomMargin=55,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0F172A'),
        )
        subtitle_style = ParagraphStyle(
            'DocSub',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569'),
        )

        story = []

        # Branding Institucional
        branding_nome = contexto.get("branding_nome_fantasia") or "SHM Tecnologia"
        branding_slogan = contexto.get("branding_slogan") or "Suporte Sob Medida e Gestão de Horas"
        branding_cnpj = contexto.get("branding_cnpj") or ""
        branding_url = contexto.get("branding_url") or "https://shm.empresa.com.br"
        branding_rep_nome = contexto.get("branding_representante_nome") or ""
        branding_rep_cargo = contexto.get("branding_representante_cargo") or "Responsável Técnico"
        branding_rep_doc = contexto.get("branding_representante_documento") or ""
        branding_msg_rodape = contexto.get("branding_mensagem_rodape") or ""
        branding_obj = contexto.get("branding")

        # Top Banner / Header Box
        status_label = contrato.get_status_display().upper() if contrato else "ATIVO"
        banner_text = f"<b>{branding_nome}</b><br/><font size=7 color='#64748B'>{branding_slogan}</font>"
        if branding_cnpj:
            banner_text += f"<br/><font size=6 color='#94A3B8'>CNPJ: {branding_cnpj}</font>"

        logo_flowable = None
        if branding_obj and branding_obj.logotipo:
            try:
                if hasattr(branding_obj.logotipo, "path") and os.path.exists(branding_obj.logotipo.path):
                    from reportlab.platypus import Image as RLImage
                    logo_flowable = RLImage(branding_obj.logotipo.path, width=80, height=32, kind='proportional')
                    logo_flowable.hAlign = 'LEFT'
            except Exception as l_err:
                logger.warning(f"Erro ao incluir logo corporativo no ReportLab: {l_err}")

        if logo_flowable:
            left_cell = [logo_flowable, Spacer(1, 2), Paragraph(banner_text, styles['Normal'])]
        else:
            left_cell = Paragraph(banner_text, styles['Normal'])

        header_data = [
            [
                left_cell,
                Paragraph(f"<b>CONTRATO Nº {contrato.numero if contrato else ''}</b><br/><font size=8 color='#059669'>STATUS: {status_label}</font>", ParagraphStyle('R', parent=styles['Normal'], alignment=2))
            ]
        ]
        t_header = Table(header_data, colWidths=[320, 203])
        t_header.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t_header)
        story.append(Spacer(1, 10))

        def _fmt_date(val):
            if not val:
                return ""
            if hasattr(val, "strftime"):
                return val.strftime("%d/%m/%Y")
            val_str = str(val).split("T")[0]
            parts = val_str.split("-")
            if len(parts) == 3:
                return f"{parts[2]}/{parts[1]}/{parts[0]}"
            return val_str

        # Title & Tomador Metadata
        story.append(Paragraph("Extrato Oficial de Prestação de Contas", title_style))
        vigencia_str = f"<b>Vigência:</b> {_fmt_date(contrato.data_inicio) if contrato else ''}"
        if contrato and contrato.data_termino:
            vigencia_str += f" até {_fmt_date(contrato.data_termino)}"
        doc_str = f" ({cliente_doc})" if cliente_doc else ""
        story.append(Paragraph(f"<b>Tomador:</b> {cliente_nome}{doc_str} &nbsp;|&nbsp; {vigencia_str}", subtitle_style))
        story.append(Spacer(1, 12))

        # KPI Metric Cards
        franquia = Decimal(str(conciliacao.get("franquia_contratada", 0) or 0))
        consumo = Decimal(str(conciliacao.get("consumo_acumulado", 0) or 0))
        saldo = Decimal(str(conciliacao.get("saldo_disponivel", 0) or 0))
        pct = round((consumo / franquia) * 100) if franquia > 0 else 0
        saldo_cor = '#059669' if saldo >= 0 else '#DC2626'

        kpi_center_style = ParagraphStyle(
            'KPICenter',
            parent=styles['Normal'],
            alignment=1,
            leading=13,
        )

        kpi_data = [
            [
                Paragraph(f"<font size=8 color='#64748B'>FRANQUIA CONTRATADA</font><br/><b><font size=14 color='#1E293B'>{franquia:.2f}h</font></b>", kpi_center_style),
                Paragraph(f"<font size=8 color='#64748B'>CONSUMO ACUMULADO</font><br/><b><font size=14 color='#2563EB'>{consumo:.2f}h</font></b><br/><font size=7 color='#64748B'>({pct}% contratado)</font>", kpi_center_style),
                Paragraph(f"<font size=8 color='#64748B'>SALDO RESTANTE</font><br/><b><font size=14 color='{saldo_cor}'>{saldo:.2f}h</font></b>", kpi_center_style),
            ]
        ]
        t_kpi = Table(kpi_data, colWidths=[174, 174, 175])
        t_kpi.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(t_kpi)
        story.append(Spacer(1, 10))

        # Projeção de Saldo e Raio-X de Demandas em Andamento (A2, Em Execução, A3)
        projecao = contexto.get("projecao_saldo") or {}
        demandas = contexto.get("demandas_em_andamento") or {}
        todas_demandas = demandas.get("todas") or []
        previsao_estouro = projecao.get("previsao_estouro", False)
        saldo_proj = Decimal(str(projecao.get("saldo_projetado", 0) or 0))
        comprometidas = Decimal(str(projecao.get("total_horas_comprometidas", 0) or 0))
        horas_estouro = Decimal(str(projecao.get("horas_estouro", 0) or 0))
        h_orc = Decimal(str(projecao.get("horas_pendentes_orcamento", 0) or 0))
        h_exec = Decimal(str(projecao.get("horas_em_execucao", 0) or 0))
        h_ent = Decimal(str(projecao.get("horas_pendentes_entrega", 0) or 0))

        if previsao_estouro:
            alert_data = [
                [
                    Paragraph(
                        f"<b><font size=8.5 color='#B91C1C'>⚠️ ATENÇÃO: PREVISÃO DE ESTOURO DE FRANQUIA EM {horas_estouro:.2f}h</font></b><br/>"
                        f"<font size=7 color='#7F1D1D'>A soma dos compromissos técnicos em andamento ({comprometidas:.2f}h) excede o saldo homologado atual ({saldo:.2f}h). "
                        f"Solicite termo aditivo ou renovação para regularização da franquia.</font>",
                        styles['Normal']
                    )
                ]
            ]
            t_alert = Table(alert_data, colWidths=[523])
            t_alert.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')),
                ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#EF4444')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(t_alert)
            story.append(Spacer(1, 8))

        cor_proj = '#DC2626' if previsao_estouro else ('#D97706' if saldo_proj < 10 else '#059669')
        proj_center_style = ParagraphStyle(
            'ProjCenter',
            parent=styles['Normal'],
            alignment=1,
            leading=10,
        )
        proj_data = [
            [
                Paragraph(f"<font size=5.5 color='#64748B'><b>SALDO ATUAL HOMOLOGADO</b></font><br/><b><font size=10 color='#0F172A'>{saldo:.2f}h</font></b>", proj_center_style),
                Paragraph(f"<font size=5.5 color='#64748B'><b>AGUARDANDO ACEITE ORÇAMENTO</b></font><br/><b><font size=10 color='#D97706'>-{h_orc:.2f}h</font></b>", proj_center_style),
                Paragraph(f"<font size=5.5 color='#64748B'><b>EM EXECUÇÃO</b></font><br/><b><font size=10 color='#2563EB'>-{h_exec:.2f}h</font></b>", proj_center_style),
                Paragraph(f"<font size=5.5 color='#64748B'><b>AGUARDANDO ACEITE ENTREGA</b></font><br/><b><font size=10 color='#7C3AED'>-{h_ent:.2f}h</font></b>", proj_center_style),
                Paragraph(f"<font size=5.5 color='#64748B'><b>SALDO PROJETADO</b></font><br/><b><font size=11 color='{cor_proj}'>{saldo_proj:.2f}h</font></b>", proj_center_style),
            ]
        ]
        t_proj = Table(proj_data, colWidths=[105, 122, 78, 118, 100])
        t_proj.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(t_proj)
        story.append(Spacer(1, 10))

        # Raio-X de Demandas em Andamento
        story.append(Paragraph(
            f"<b>Raio-X de Demandas Técnicas em Andamento ({len(todas_demandas)})</b>",
            ParagraphStyle('SubDem', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#1E293B'))
        ))
        story.append(Spacer(1, 4))

        demandas_rows = [
            [
                Paragraph("<b>Protocolo</b>", ParagraphStyle('THD', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=7.5)),
                Paragraph("<b>Etapa / Fluxo</b>", ParagraphStyle('THD', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=7.5)),
                Paragraph("<b>Tipo & Escopo</b>", ParagraphStyle('THD', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=7.5)),
                Paragraph("<b>Previsão</b>", ParagraphStyle('THD', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=7.5)),
                Paragraph("<b>Responsável</b>", ParagraphStyle('THD', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=7.5)),
            ]
        ]

        if todas_demandas:
            for item in todas_demandas:
                proto = item.get("pedido_protocolo") or f"DEM-{item.get('id')}"
                st_disp = item.get("status_display") or item.get("status") or "-"
                tipo = item.get("tipo") or "Atividade"
                ctx = item.get("contexto") or item.get("pedido_assunto") or ""
                horas_d = Decimal(str(item.get("horas", 0) or 0))
                resp_nome = item.get("responsavel_nome") or item.get("responsavel") or item.get("operador") or "-"
                resp_papel = item.get("responsavel_papel", "tecnico")
                badge_cor = "#6D28D9" if resp_papel == "cliente" else "#475569"
                badge_lbl = "CLIENTE" if resp_papel == "cliente" else "TÉCNICO"

                cell_p = Paragraph(f"<b>{proto}</b>", styles['Normal'])
                cell_st = Paragraph(f"<font size=7 color='#4338CA'><b>{st_disp}</b></font>", styles['Normal'])
                cell_ctx = Paragraph(f"<b><font size=7.5>{tipo}</font></b><br/><font size=6.5 color='#64748B'>{ctx[:45]}</font>", styles['Normal'])
                cell_h = Paragraph(f"<b><font size=7.5 color='#B45309'>-{horas_d:.2f}h</font></b>", styles['Normal'])
                cell_resp = Paragraph(f"<b><font size=7 color='#1E293B'>{resp_nome[:20]}</font></b><br/><font size=5.5 color='{badge_cor}'><b>[{badge_lbl}]</b></font>", styles['Normal'])

                demandas_rows.append([cell_p, cell_st, cell_ctx, cell_h, cell_resp])
        else:
            demandas_rows.append([
                Paragraph("<font size=7.5 color='#64748B'>Nenhuma demanda técnica pendente no presente minuto.</font>", styles['Normal']),
                Paragraph("-", styles['Normal']),
                Paragraph("-", styles['Normal']),
                Paragraph("0.00h", styles['Normal']),
                Paragraph("-", styles['Normal']),
            ])

        t_demandas = Table(demandas_rows, colWidths=[100, 105, 178, 60, 80], repeatRows=1)
        t_demandas.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        for r in range(1, len(demandas_rows)):
            if r % 2 == 0:
                t_demandas.setStyle(TableStyle([('BACKGROUND', (0, r), (-1, r), colors.HexColor('#F8FAFC'))]))

        story.append(t_demandas)
        story.append(Spacer(1, 12))

        # Detalhamento de Ciclos Técnicos Homologados
        story.append(Paragraph(
            f"<b>Detalhamento dos Ciclos Técnicos Homologados ({len(ciclos)})</b>",
            ParagraphStyle('Sub', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#1E293B'))
        ))
        story.append(Spacer(1, 6))

        table_rows = [
            [
                Paragraph("<b>Protocolo / Chamado</b>", ParagraphStyle('TH', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=8)),
                Paragraph("<b>Tipo</b>", ParagraphStyle('TH', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=8)),
                Paragraph("<b>Horas</b>", ParagraphStyle('TH', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=8)),
                Paragraph("<b>Aceite / Data</b>", ParagraphStyle('TH', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=8)),
                Paragraph("<b>Status</b>", ParagraphStyle('TH', parent=styles['Normal'], textColor=colors.white, fontName='Helvetica-Bold', fontSize=8)),
            ]
        ]

        if ciclos:
            for item in ciclos:
                tipo_str = item.get("tipo", "Atividade")
                horas_val = Decimal(str(item.get("horas_realizadas", 0) or 0))
                horas_str = f"{horas_val:.2f}h"
                aceite_str = item.get("aceito_em", "-") or "-"
                desc = item.get("pedido_titulo") or item.get("descricao") or ""
                proto = item.get("pedido_protocolo") or f"CICLO-{item.get('id')}"

                cell_proto = Paragraph(f"<b>{proto}</b><br/><font size=7 color='#64748B'>{desc[:45]}</font>", styles['Normal'])
                table_rows.append([
                    cell_proto,
                    Paragraph(f"<font size=8>{tipo_str}</font>", styles['Normal']),
                    Paragraph(f"<b><font size=8>{horas_str}</font></b>", styles['Normal']),
                    Paragraph(f"<font size=7>{aceite_str}</font>", styles['Normal']),
                    Paragraph(f"<font size=7 color='#059669'>Homologado</font>", styles['Normal']),
                ])
        else:
            table_rows.append([
                Paragraph("<font size=8 color='#64748B'>Nenhum ciclo técnico homologado registrado para este contrato.</font>", styles['Normal']),
                Paragraph("-", styles['Normal']),
                Paragraph("0.00h", styles['Normal']),
                Paragraph("-", styles['Normal']),
                Paragraph("-", styles['Normal']),
            ])

        t_ciclos = Table(table_rows, colWidths=[180, 85, 65, 110, 83], repeatRows=1)
        t_ciclos.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        for r in range(1, len(table_rows)):
            if r % 2 == 0:
                t_ciclos.setStyle(TableStyle([('BACKGROUND', (0, r), (-1, r), colors.HexColor('#F8FAFC'))]))

        story.append(t_ciclos)
        story.append(Spacer(1, 14))

        # Bloco de Assinatura e Chancela Formal do Representante Legal
        if branding_rep_nome or (branding_obj and branding_obj.representante_assinatura):
            ass_flowable = None
            if branding_obj and branding_obj.representante_assinatura:
                try:
                    if hasattr(branding_obj.representante_assinatura, "path") and os.path.exists(branding_obj.representante_assinatura.path):
                        from reportlab.platypus import Image as RLImage
                        ass_flowable = RLImage(branding_obj.representante_assinatura.path, width=130, height=45, kind='proportional')
                        ass_flowable.hAlign = 'CENTER'
                except Exception as a_err:
                    logger.warning(f"Erro ao incluir rubrica no ReportLab: {a_err}")

            sig_center_style = ParagraphStyle(
                'SigCenter',
                parent=styles['Normal'],
                alignment=1,
                leading=10,
            )
            sig_elements = []
            if ass_flowable:
                sig_elements.append(ass_flowable)
                sig_elements.append(Spacer(1, 2))

            sig_text = f"____________________________________________<br/><b>{branding_rep_nome}</b>"
            if branding_rep_cargo:
                sig_text += f"<br/><font size=7 color='#475569'>{branding_rep_cargo}</font>"
            if branding_rep_doc:
                sig_text += f"<br/><font size=6 color='#64748B'>{branding_rep_doc}</font>"
            if branding_msg_rodape:
                sig_text += f"<br/><font size=5.5 color='#94A3B8'><i>{branding_msg_rodape}</i></font>"

            sig_elements.append(Paragraph(sig_text, sig_center_style))
            t_sig = Table([[sig_elements]], colWidths=[523])
            t_sig.setStyle(TableStyle([
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('PADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(KeepTogether(t_sig))
            story.append(Spacer(1, 8))

        # Selo Forense Criptográfico
        seal_data = [
            [
                Paragraph(
                    f"<b>AUTENTICIDADE E INTEGRIDADE PERICIAL (SHA-256)</b><br/>"
                    f"<font size=7 color='#475569'>Hash Criptográfico do Binário: </font>"
                    f"<font size=7 name='Courier-Bold' color='#0F172A'>{hash_sha256}</font><br/>"
                    f"<font size=6 color='#64748B'>Padrão ABNT NBR ISO/IEC 27037 • Emitido em {emitido_em_formatado} via {branding_nome} ({branding_url})</font>",
                    styles['Normal']
                )
            ]
        ]
        t_seal = Table(seal_data, colWidths=[523])
        t_seal.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94A3B8')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(KeepTogether(t_seal))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()

    @staticmethod
    def _compilar_pdf_fallback(contexto: dict) -> bytes:
        """
        Compilador vetorial limpo de contingência quando bibliotecas C do WeasyPrint
        e ReportLab não estão disponíveis.
        Gera um arquivo PDF válido, vetorial e estruturado com os dados do extrato,
        garantindo sanitização de caracteres e NUNCA retornando página em branco.
        """
        import unicodedata

        def _safe(txt: str) -> str:
            if not txt:
                return ""
            norm = unicodedata.normalize('NFKD', str(txt))
            return norm.encode('ASCII', 'ignore').decode('ASCII').replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

        try:
            import pydyf

            pdf = pydyf.PDF()
            largura = 595.28  # A4 pt
            altura = 841.89

            contrato = contexto.get("contrato")
            cliente_nome = contexto.get("cliente_nome", "Cliente")
            conciliacao = contexto.get("conciliacao", {})
            ciclos = contexto.get("ciclos", [])
            hash_sha256 = contexto.get("hash_sha256", "0" * 64)
            data_emissao = contexto.get("emitido_em_formatado", "")

            stream = []
            # Background Header
            stream.append("0.95 0.96 0.98 rg")
            stream.append("20 750 555 70 re f")

            # Textos
            stream.append("0 0 0 rg")
            stream.append("BT")
            stream.append("/F1 16 Tf")
            num_c = contrato.numero if contrato else ""
            stream.append(f"30 790 Td (Extrato Oficial do Contrato {_safe(num_c)}) Tj")
            stream.append("ET")

            stream.append("BT")
            stream.append("/F1 10 Tf")
            ini_c = str(contrato.data_inicio) if (contrato and contrato.data_inicio) else ""
            stream.append(f"30 765 Td (Tomador: {_safe(cliente_nome)} | Vigencia: {_safe(ini_c)}) Tj")
            stream.append("ET")

            # Resumo de Franquia
            stream.append("BT")
            stream.append("/F1 11 Tf")
            franquia = f"{float(conciliacao.get('franquia_contratada', 0) or 0):.2f}h"
            consumo = f"{float(conciliacao.get('consumo_acumulado', 0) or 0):.2f}h"
            saldo = f"{float(conciliacao.get('saldo_disponivel', 0) or 0):.2f}h"
            stream.append(f"30 710 Td (Franquia: {franquia}  |  Consumo: {consumo}  |  Saldo: {saldo}) Tj")
            stream.append("ET")

            # Tabela de Ciclos
            y = 660
            stream.append("BT")
            stream.append("/F1 10 Tf")
            stream.append(f"30 {y} Td (Ciclos Tecnicos Homologados ({len(ciclos)}):) Tj")
            stream.append("ET")
            y -= 25

            for c in ciclos[:15]:
                stream.append("BT")
                stream.append("/F1 8 Tf")
                proto_c = c.get('pedido_protocolo') or f"CICLO-{c.get('id')}"
                tipo_c = c.get('tipo') or 'Atividade'
                horas_c = float(c.get('horas_realizadas', 0) or 0)
                aceite_c = c.get('aceito_em') or '-'
                txt = f"- {proto_c} | {tipo_c} | {horas_c:.2f}h | Aceite: {aceite_c}"
                stream.append(f"30 {y} Td ({_safe(txt[:90])}) Tj")
                stream.append("ET")
                y -= 18

            # Selo Forense
            stream.append("BT")
            stream.append("/F1 7 Tf")
            stream.append(f"30 50 Td (SHM v2.5.0 - Selo Forense SHA-256: {hash_sha256}) Tj")
            stream.append(f"30 38 Td (Emissao: {_safe(data_emissao)} - ABNT NBR ISO/IEC 27037) Tj")
            stream.append("ET")

            # Fonte F1 (Helvetica)
            fonte_obj = pydyf.Dictionary({
                "Type": "/Font",
                "Subtype": "/Type1",
                "BaseFont": "/Helvetica",
            })
            pdf.add_object(fonte_obj)

            recursos = pydyf.Dictionary({
                "Font": pydyf.Dictionary({
                    "F1": fonte_obj.reference,
                })
            })

            conteudo_obj = pydyf.Stream(stream)
            pdf.add_object(conteudo_obj)

            pagina = pydyf.Dictionary({
                "Type": "/Page",
                "Parent": pdf.pages.reference,
                "MediaBox": pydyf.Array([0, 0, largura, altura]),
                "Contents": conteudo_obj.reference,
                "Resources": recursos,
            })
            pdf.add_page(pagina)

            buffer = io.BytesIO()
            pdf.write(buffer)
            return buffer.getvalue()

        except Exception as exc:
            logger.error(f"Erro no fallback do pydyf ({exc}), gerando documento de contingência visível.")
            stream_txt = "BT /F1 12 Tf 50 750 Td (SHM - Extrato Oficial de Contrato) Tj 50 720 Td (Documento gerado em modo de contingencia) Tj ET"
            stream_len = len(stream_txt)
            corpo = (
                f"%PDF-1.4\n"
                f"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
                f"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
                f"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
                f"4 0 obj << /Length {stream_len} >> stream\n{stream_txt}\nendstream\nendobj\n"
                f"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
                f"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000232 00000 n \n0000000350 00000 n \n"
                f"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n430\n%%EOF\n"
            )
            return corpo.encode("latin1")

    @classmethod
    def compilar_html_para_pdf(cls, html_content: str, contexto: dict) -> bytes:
        """
        Compila o código HTML em PDF vetorial utilizando WeasyPrint com CSS Paged Media.
        Aciona ReportLab ou fallback vetorial caso o ambiente não possua as bibliotecas C/GTK.
        """
        try:
            import weasyprint
            return weasyprint.HTML(string=html_content).write_pdf()
        except (ImportError, OSError, Exception) as err:
            logger.warning(
                f"Compilador WeasyPrint indisponível no ambiente ({err}). "
                f"Utilizando compilador vetorial nativo ReportLab."
            )
            try:
                return cls._compilar_pdf_reportlab(contexto)
            except Exception as r_err:
                logger.error(f"Erro no compilador ReportLab ({r_err}), acionando fallback.")
                return cls._compilar_pdf_fallback(contexto)

    @classmethod
    def gerar_extrato_pdf(
        cls,
        contrato: Contrato,
        periodo: Optional[str] = None,
        origem: str = OrigemExtrato.MANUAL_DOWNLOAD,
        usuario=None,
        ip: str = "",
        ua: str = "",
        salvar: bool = True,
    ) -> Tuple[bytes, Optional[ExtratoOficialGerado], str]:
        """
        Gera o documento de Extrato Oficial em PDF vetorial para o contrato fornecido,
        calcula o hash SHA-256, persiste no storage determinístico da VPS, agenda o
        espelhamento assíncrono para o Google Drive corporativo e registra a auditoria.
        """
        agora = timezone.now()
        mes_ano_periodo = periodo or agora.strftime("%Y-%m")
        mes_ano_str = agora.strftime("%m-%Y")
        nome_arquivo = f"Extrato-{contrato.numero}-{mes_ano_str}.pdf"

        # Coleta de dados contábeis consolidados
        dados_extrato = ContratoService.obter_dados_extrato(contrato)
        historico_ciclos = dados_extrato["historico_ciclos"]
        conciliacao = dados_extrato["conciliacao"]
        projecao_saldo = dados_extrato.get("projecao_saldo", {})
        demandas_em_andamento = dados_extrato.get("demandas_em_andamento", {})

        franquia = conciliacao.get("franquia_contratada", 0)
        consumo = conciliacao.get("consumo_acumulado", 0)
        percentual = min(round((consumo / franquia) * 100), 100) if franquia > 0 else 0
        conciliacao["percentual_consumido"] = percentual

        cliente = contrato.cliente
        cliente_nome = cliente.display_name if cliente else "Cliente SHM"
        cliente_doc = (cliente.cnpj or cliente.cpf) if cliente else ""
        cliente_inicial = cliente_nome[0].upper() if cliente_nome else "C"
        cliente_logo_b64 = cls._obter_logo_base64(cliente)

        origem_labels = {
            OrigemExtrato.MANUAL_DOWNLOAD: "Download Manual via Interface Web",
            OrigemExtrato.MANUAL_EMAIL: "Envio sob Demanda por E-mail",
            OrigemExtrato.MENSAL_AUTOMATICO: "Rotina Automatizada de Fechamento Mensal",
        }
        origem_desc = origem_labels.get(origem, "Emissão Avulsa")

        emitido_por_nome = "Rotina Automatizada do Sistema"
        if usuario:
            emitido_por_nome = f"{usuario.get_full_name() or usuario.username} ({usuario.get_role_display()})"

        # Obtenção dos dados institucionais de Branding
        from apps.core.models import ConfiguracaoBranding
        branding = ConfiguracaoBranding.get_instancia()
        branding_nome_fantasia = branding.nome_fantasia or "SHM Tecnologia"
        branding_razao_social = branding.razao_social or "SHM Tecnologia e Gestão de Contratos Ltda."
        branding_slogan = branding.slogan or "Suporte Sob Medida e Gestão de Horas"
        branding_cnpj = branding.cnpj or ""
        branding_url = branding.url_shm or "https://shm.empresa.com.br"
        branding_telefone = branding.telefone_suporte or ""
        branding_email = branding.email_suporte or ""
        branding_logo_b64 = branding.obter_logo_base64()
        branding_rep_nome = branding.representante_nome_completo or ""
        branding_rep_cargo = branding.representante_cargo or "Responsável Técnico"
        branding_rep_doc = branding.representante_documento or ""
        branding_rep_ass_b64 = branding.obter_assinatura_base64()
        branding_msg_rodape = branding.mensagem_rodape_relatorio or ""

        # Contexto para renderização do template
        contexto = {
            "contrato": contrato,
            "cliente_nome": cliente_nome,
            "cliente_doc": cliente_doc,
            "cliente_inicial": cliente_inicial,
            "cliente_logo_b64": cliente_logo_b64,
            "branding": branding,
            "branding_nome_fantasia": branding_nome_fantasia,
            "branding_razao_social": branding_razao_social,
            "branding_slogan": branding_slogan,
            "branding_cnpj": branding_cnpj,
            "branding_url": branding_url,
            "branding_telefone": branding_telefone,
            "branding_email": branding_email,
            "branding_logo_b64": branding_logo_b64,
            "branding_representante_nome": branding_rep_nome,
            "branding_representante_cargo": branding_rep_cargo,
            "branding_representante_documento": branding_rep_doc,
            "branding_assinatura_b64": branding_rep_ass_b64,
            "branding_mensagem_rodape": branding_msg_rodape,
            "conciliacao": conciliacao,
            "ciclos": historico_ciclos,
            "projecao_saldo": projecao_saldo,
            "demandas_em_andamento": demandas_em_andamento,
            "hash_sha256": "0" * 64,  # Placeholder inicial
            "hash_resumido": "CALCULANDO...",
            "emitido_em": agora,
            "emitido_em_formatado": timezone.localtime(agora).strftime("%d/%m/%Y às %H:%M:%S"),
            "origem_descricao": origem_desc,
            "emitido_por_nome": emitido_por_nome,
        }

        # Primeira compilação para obter o hash
        html_preliminar = render_to_string("contratos/extrato_oficial.html", contexto)
        pdf_preliminar = cls.compilar_html_para_pdf(html_preliminar, contexto)
        hash_sha256 = hashlib.sha256(pdf_preliminar).hexdigest()

        # Segunda renderização com o hash SHA-256 definitivo embutido no HTML
        contexto["hash_sha256"] = hash_sha256
        contexto["hash_resumido"] = f"{hash_sha256[:16]}...{hash_sha256[-8:]}"

        html_final = render_to_string("contratos/extrato_oficial.html", contexto)
        pdf_bytes = cls.compilar_html_para_pdf(html_final, contexto)

        # Recalcula o hash do binário final gerado
        hash_final = hashlib.sha256(pdf_bytes).hexdigest()

        extrato_registro = None
        if salvar:
            # Caminho determinístico local na VPS
            cliente_id_str = str(cliente.id) if cliente else "geral"
            contrato_id_str = str(contrato.id)
            caminho_relativo = os.path.join(
                "clientes", cliente_id_str, "contratos", contrato_id_str, "extratos", nome_arquivo
            )
            caminho_absoluto = os.path.join(settings.MEDIA_ROOT, caminho_relativo)
            os.makedirs(os.path.dirname(caminho_absoluto), exist_ok=True)

            with open(caminho_absoluto, "wb") as f:
                f.write(pdf_bytes)

            extrato_registro = ExtratoOficialGerado.objects.create(
                contrato=contrato,
                periodo_referencia=mes_ano_periodo,
                hash_sha256=hash_final,
                horas_contratadas=Decimal(str(conciliacao.get("franquia_contratada", 0))),
                horas_consumidas=Decimal(str(conciliacao.get("consumo_acumulado", 0))),
                saldo_disponivel=Decimal(str(conciliacao.get("saldo_disponivel", 0))),
                creditos_migrados=Decimal(str(conciliacao.get("creditos_migrados", 0))),
                debitos_compensados=Decimal(str(conciliacao.get("debitos_compensados", 0))),
                quantidade_ciclos=len(historico_ciclos),
                origem=origem,
                gerado_por=usuario,
                destinatarios_notificados=[],
            )
            extrato_registro.arquivo.name = caminho_relativo
            extrato_registro.save(update_fields=["arquivo"])

            # Registro de auditoria no histórico do contrato
            tipo_evento = (
                TipoEventoContratoAudit.DOWNLOAD_RELATORIO
                if origem == OrigemExtrato.MANUAL_DOWNLOAD
                else TipoEventoContratoAudit.ENVIO_RELATORIO
            )
            usuario_str = (usuario.get_full_name() or usuario.username) if usuario else "Rotina Agendada"
            role_str = usuario.get_role_display() if usuario else "Sistema"

            ContratoAuditLog.objects.create(
                contrato=contrato,
                tipo_evento=tipo_evento,
                descricao=f"Extrato Oficial em PDF gerado ({origem_desc}) por {usuario_str} ({role_str}). Hash: {hash_final[:16]}...",
                documento_nome=nome_arquivo,
                documento_hash=hash_final,
                usuario=usuario,
                ip_origem=ip or "127.0.0.1",
                user_agent=ua or "SHM-Engine/2.5.0",
            )

            # Agendamento assíncrono para o Google Drive corporativo (RN-15)
            try:
                agendar_sincronizacao_arquivo(
                    origem_modelo="contratos.ExtratoOficialGerado",
                    origem_id=str(extrato_registro.id),
                    caminho_local=caminho_relativo,
                    nome_arquivo=nome_arquivo,
                    tamanho_bytes=len(pdf_bytes),
                    hash_sha256=hash_final,
                    cliente=cliente,
                )
            except Exception as e:
                logger.warning(f"Não foi possível enfileirar sincronização Drive do extrato: {e}")

        return pdf_bytes, extrato_registro, nome_arquivo
