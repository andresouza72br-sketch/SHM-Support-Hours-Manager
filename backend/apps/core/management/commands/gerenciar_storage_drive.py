import os
import sys
from django.core.management.base import BaseCommand
from apps.clientes.models import Cliente
from apps.core.storage.google_drive_service import GoogleDriveStorageService

class Command(BaseCommand):
    help = "Ferramenta de governança, diagnóstico e auditoria de permissões do SHM Google Drive Storage."

    def add_arguments(self, parser):
        parser.add_argument(
            "--diagnostico",
            action="store_true",
            help="Executa diagnóstico completo da conexão, cota e estado das pastas",
        )
        parser.add_argument(
            "--auditar-permissoes",
            action="store_true",
            help="Audita as permissões ativas de todas as pastas de clientes no Google Drive",
        )
        parser.add_argument(
            "--trocar-email-cliente",
            action="store_true",
            help="Executa a rotação segura do e-mail Google associado à pasta do cliente",
        )
        parser.add_argument(
            "--cliente-id",
            type=int,
            help="ID do cliente (usado com --trocar-email-cliente ou auditoria individual)",
        )
        parser.add_argument(
            "--novo-email",
            type=str,
            help="Novo endereço de e-mail Google para concessão de acesso",
        )

    def handle(self, *args, **options):
        diagnostico = options.get("diagnostico")
        auditar = options.get("auditar_permissoes")
        trocar = options.get("trocar_email_cliente")
        cliente_id = options.get("cliente_id")
        novo_email = options.get("novo_email")

        service = GoogleDriveStorageService()

        if trocar:
            self._executar_troca_email(service, cliente_id, novo_email)
            return

        if auditar:
            self._executar_auditoria_permissoes(service, cliente_id)
            return

        # Padrão: roda diagnóstico
        self._executar_diagnostico(service, cliente_id)

    def _executar_diagnostico(self, service: GoogleDriveStorageService, cliente_id=None):
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 75))
        self.stdout.write(self.style.MIGRATE_HEADING("  DIAGNÓSTICO GERAL: SHM CLOUD STORAGE (GOOGLE DRIVE 5 TB)"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 75))

        diag = service.testar_conexao()
        self.stdout.write(f"• Status da Conexão:  {diag.get('status_conexao', 'desconhecido').upper()}")
        self.stdout.write(f"• Modo Operacional:   {diag.get('modo', 'desconhecido')}")
        self.stdout.write(f"• Conta Corporativa:  {diag.get('service_account_email', 'Não identificada')}")

        quota = diag.get("quota")
        if quota:
            limite_gb = int(quota.get("limit", 0)) / (1024 ** 3)
            uso_gb = int(quota.get("usage", 0)) / (1024 ** 3)
            livre_gb = limite_gb - uso_gb
            self.stdout.write(self.style.SUCCESS(f"• Cota Total:         {limite_gb:.2f} GB ({limite_gb / 1024:.2f} TB)"))
            self.stdout.write(f"• Espaço Utilizado:   {uso_gb:.2f} GB ({uso_gb / 1024:.3f} TB)")
            self.stdout.write(self.style.SUCCESS(f"• Espaço Disponível:  {livre_gb:.2f} GB ({livre_gb / 1024:.2f} TB)"))

        # Verifica pasta raiz
        root_id = service.obter_ou_criar_pasta_raiz()
        self.stdout.write(f"• Pasta Raiz (Drive): '{service.root_folder_name}' (ID: {root_id})")

        # Estatísticas de Clientes
        qs = Cliente.objects.all()
        if cliente_id:
            qs = qs.filter(id=cliente_id)

        total_clientes = qs.count()
        clientes_com_pasta = qs.exclude(gdrive_folder_id__isnull=True).exclude(gdrive_folder_id="").count()

        self.stdout.write(f"• Clientes no Sistema: {total_clientes} (Com pasta provisionada: {clientes_com_pasta})\n")

        for c in qs:
            status_cor = self.style.SUCCESS if c.gdrive_folder_id else self.style.WARNING
            self.stdout.write(status_cor(
                f"  [{c.id}] {c.display_name}\n"
                f"      E-mail Drive: {c.email_google_drive or 'NÃO DEFINIDO'}\n"
                f"      Folder ID:    {c.gdrive_folder_id or 'PENDENTE'}\n"
                f"      Link:         {c.gdrive_folder_url or 'Nenhum'}\n"
            ))

    def _executar_auditoria_permissoes(self, service: GoogleDriveStorageService, cliente_id=None):
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 75))
        self.stdout.write(self.style.MIGRATE_HEADING("  AUDITORIA DE PERMISSÕES ATIVAS NO GOOGLE DRIVE"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 75))

        qs = Cliente.objects.exclude(gdrive_folder_id__isnull=True).exclude(gdrive_folder_id="")
        if cliente_id:
            qs = qs.filter(id=cliente_id)

        if not qs.exists():
            self.stdout.write(self.style.WARNING("Nenhum cliente com pasta provisionada encontrado para auditoria."))
            return

        for c in qs:
            self.stdout.write(self.style.NOTICE(f"\nAuditando Cliente [{c.id}] {c.display_name}:"))
            self.stdout.write(f"  Pasta ID: {c.gdrive_folder_id}")
            self.stdout.write(f"  E-mail Oficial Cadastrado: {c.email_google_drive or 'Nenhum'}")

            permissoes = service.listar_permissoes(c.gdrive_folder_id)
            if not permissoes:
                self.stdout.write(self.style.WARNING("  [AVISO] Nenhuma permissao retornada ou ambiente em simulacao."))
                continue

            email_oficial = (c.email_google_drive or "").strip().lower()
            encontrou_oficial = False

            for p in permissoes:
                email_p = (p.get("emailAddress") or "").strip().lower()
                role_p = p.get("role")
                disp_name = p.get("displayName") or "Sem nome"

                if email_p == email_oficial:
                    encontrou_oficial = True
                    self.stdout.write(self.style.SUCCESS(
                        f"  [CONFORME] {email_p} ({disp_name}) -> Role: {role_p}"
                    ))
                elif role_p == "owner":
                    self.stdout.write(f"  [PROPRIETARIO] {email_p} ({disp_name}) -> Role: owner")
                else:
                    self.stdout.write(self.style.WARNING(
                        f"  [OUTRO ACESSO] {email_p} ({disp_name}) -> Role: {role_p}"
                    ))

            if email_oficial and not encontrou_oficial:
                self.stdout.write(self.style.ERROR(
                    f"  [DIVERGENCIA] O e-mail cadastrado '{email_oficial}' NAO possui permissao ativa nesta pasta!"
                ))

        self.stdout.write(self.style.SUCCESS("\nAuditoria de permissoes concluida com sucesso.\n"))

    def _executar_troca_email(self, service: GoogleDriveStorageService, cliente_id, novo_email):
        if not cliente_id:
            self.stdout.write(self.style.ERROR("ERRO: Parametro --cliente-id obrigatorio para troca de e-mail."))
            return
        if not novo_email or "@" not in novo_email:
            self.stdout.write(self.style.ERROR("ERRO: Parametro --novo-email invalido."))
            return

        cliente = Cliente.objects.filter(id=cliente_id).first()
        if not cliente:
            self.stdout.write(self.style.ERROR(f"ERRO: Cliente com ID {cliente_id} nao encontrado."))
            return

        self.stdout.write(self.style.NOTICE(f"\nIniciando troca segura de e-mail para Cliente [{cliente.id}] {cliente.display_name}..."))
        self.stdout.write(f"  E-mail anterior: {cliente.email_google_drive or 'Nenhum'}")
        self.stdout.write(f"  Novo e-mail:     {novo_email}")

        resultado = service.trocar_email_compartilhamento(cliente, novo_email)

        if resultado.get("sucesso"):
            self.stdout.write(self.style.SUCCESS("\n[SUCESSO] Transicao concluida com sucesso!"))
            self.stdout.write(f"  Folder ID:             {resultado.get('folder_id')}")
            self.stdout.write(f"  Permissoes revogadas:  {resultado.get('permissoes_revogadas')}")
            self.stdout.write(f"  Compartilhado em:      {resultado.get('shared_at')}\n")
        else:
            self.stdout.write(self.style.ERROR(f"\n[FALHA] Falha na transicao: {resultado.get('erro')}\n"))
