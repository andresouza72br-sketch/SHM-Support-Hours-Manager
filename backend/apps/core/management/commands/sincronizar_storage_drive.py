import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.models import RegistroSincronizacaoDrive, StatusSincronizacaoDrive
from apps.core.storage import _executar_sincronizacao_em_thread, calcular_hash_sha256
from apps.pedidos.models import AnexoPedido
from apps.comunicacao.models import AnexoComentario

class Command(BaseCommand):
    help = "Varre anexos locais e sincroniza cópias pendentes com o Google Drive corporativo."

    def add_arguments(self, parser):
        parser.add_argument(
            "--cliente-id",
            type=int,
            help="Filtra sincronização para um cliente específico",
        )
        parser.add_argument(
            "--forcar",
            action="store_true",
            help="Força re-envio mesmo para arquivos já marcados como sincronizados",
        )
        parser.add_argument(
            "--apenas-erros",
            action="store_true",
            help="Reprocessa apenas arquivos com status ERRO ou PENDENTE",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando varredura e sincronização com Google Drive..."))

        cliente_id = options.get("cliente_id")
        forcar = options.get("forcar")
        apenas_erros = options.get("apenas_erros")

        # 1. Encontra e registra AnexoPedido que ainda não possuam registro de sincronização
        pedidos_anexos = AnexoPedido.objects.all().select_related("pedido")
        if cliente_id:
            pedidos_anexos = pedidos_anexos.filter(pedido__cliente_id=cliente_id)

        novos_pedidos = 0
        for anexo in pedidos_anexos:
            if not anexo.arquivo:
                continue
            caminho_rel = str(anexo.arquivo)
            caminho_abs = os.path.join(settings.MEDIA_ROOT, caminho_rel)
            if not os.path.exists(caminho_abs):
                continue

            reg, criado = RegistroSincronizacaoDrive.objects.get_or_create(
                origem_modelo="pedidos.AnexoPedido",
                origem_id=str(anexo.id),
                defaults={
                    "cliente": anexo.pedido.cliente if getattr(anexo.pedido, "cliente", None) else None,
                    "caminho_local": caminho_rel,
                    "nome_arquivo": anexo.nome_original or os.path.basename(caminho_rel),
                    "tamanho_bytes": anexo.tamanho or (os.path.getsize(caminho_abs) if os.path.exists(caminho_abs) else 0),
                    "status": StatusSincronizacaoDrive.PENDENTE,
                }
            )
            if criado:
                novos_pedidos += 1

        # 2. Encontra e registra AnexoComentario
        comentarios_anexos = AnexoComentario.objects.all().select_related("comentario__ciclo__pedido")
        if cliente_id:
            comentarios_anexos = comentarios_anexos.filter(comentario__ciclo__pedido__cliente_id=cliente_id)

        novos_comentarios = 0
        for anexo in comentarios_anexos:
            if not anexo.arquivo:
                continue
            caminho_rel = str(anexo.arquivo)
            caminho_abs = os.path.join(settings.MEDIA_ROOT, caminho_rel)
            if not os.path.exists(caminho_abs):
                continue

            cliente = None
            try:
                cliente = anexo.comentario.ciclo.pedido.cliente
            except Exception:
                pass

            reg, criado = RegistroSincronizacaoDrive.objects.get_or_create(
                origem_modelo="comunicacao.AnexoComentario",
                origem_id=str(anexo.id),
                defaults={
                    "cliente": cliente,
                    "caminho_local": caminho_rel,
                    "nome_arquivo": anexo.nome_original or os.path.basename(caminho_rel),
                    "tamanho_bytes": anexo.tamanho or (os.path.getsize(caminho_abs) if os.path.exists(caminho_abs) else 0),
                    "status": StatusSincronizacaoDrive.PENDENTE,
                }
            )
            if criado:
                novos_comentarios += 1

        self.stdout.write(f"Anexos mapeados no inventário: {novos_pedidos} de pedidos, {novos_comentarios} de comentários.")

        # 3. Executa a sincronização dos registros selecionados
        qs = RegistroSincronizacaoDrive.objects.all()
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        if apenas_erros:
            qs = qs.filter(status__in=[StatusSincronizacaoDrive.ERRO, StatusSincronizacaoDrive.PENDENTE])
        elif not forcar:
            qs = qs.exclude(status=StatusSincronizacaoDrive.SINCRONIZADO)

        total = qs.count()
        sucesso = 0
        falhas = 0

        self.stdout.write(f"Processando {total} arquivo(s) para espelhamento no Google Drive...")

        for reg in qs:
            _executar_sincronizacao_em_thread(str(reg.id))
            reg.refresh_from_db()
            if reg.status == StatusSincronizacaoDrive.SINCRONIZADO:
                sucesso += 1
                self.stdout.write(self.style.SUCCESS(f"  [OK] {reg.nome_arquivo} -> Drive ID: {reg.gdrive_file_id}"))
            else:
                falhas += 1
                self.stdout.write(self.style.WARNING(f"  [FALHA] {reg.nome_arquivo}: {reg.ultimo_erro}"))

        self.stdout.write(self.style.SUCCESS(
            f"Varredura concluída! Sucesso: {sucesso} | Falhas/Pendências: {falhas} | Total: {total}"
        ))
