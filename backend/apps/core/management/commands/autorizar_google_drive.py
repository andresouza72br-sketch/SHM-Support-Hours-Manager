import os
import sys
import urllib.parse
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
from django.core.management.base import BaseCommand
from django.conf import settings

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    auth_code = None
    error = None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            OAuthCallbackHandler.auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>SHM - Google Drive Autorizado</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center; }
                    .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 480px; }
                    h1 { color: #10b981; font-size: 1.75rem; margin-bottom: 0.5rem; }
                    p { color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }
                    .badge { display: inline-block; background: #064e3b; color: #6ee7b7; padding: 0.35rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.85rem; margin-top: 1rem; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✅ Conexão Autorizada!</h1>
                    <p>A conta <strong>proj.eng.sw@gmail.com</strong> autorizou com sucesso o acesso ao Google Drive (5 TB) para o SHM Cloud Storage.</p>
                    <span class="badge">Pronto! Pode fechar esta aba e voltar ao terminal.</span>
                </div>
            </body>
            </html>
            """
            self.wfile.write(html.encode("utf-8"))
        elif "error" in params:
            OAuthCallbackHandler.error = params["error"][0]
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"<h1>Erro na autorizacao: {OAuthCallbackHandler.error}</h1>".encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suprime logs de acesso HTTP no terminal para manter a saída limpa
        pass


class Command(BaseCommand):
    help = "Inicia o fluxo OAuth 2.0 para autorizar a conta proj.eng.sw@gmail.com no Google Drive (5 TB)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--porta",
            type=int,
            default=8080,
            help="Porta local para escutar o retorno do OAuth (padrão: 8080)",
        )

    def handle(self, *args, **options):
        porta = options.get("porta", 8080)
        client_id = (
            os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_ID")
            or os.getenv("GOOGLE_CLIENT_ID")
        )
        client_secret = (
            os.getenv("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET")
            or os.getenv("GOOGLE_CLIENT_SECRET")
        )

        if not client_id or not client_secret:
            oauth_file = os.path.join(settings.BASE_DIR, "config", "google_oauth_client.json")
            if os.path.exists(oauth_file):
                import json
                try:
                    with open(oauth_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        cfg = data.get("installed") or data.get("web") or {}
                        client_id = client_id or cfg.get("client_id")
                        client_secret = client_secret or cfg.get("client_secret")
                except Exception:
                    pass

        if not client_id or not client_secret:
            self.stdout.write(self.style.ERROR(
                "ERRO: GOOGLE_DRIVE_OAUTH_CLIENT_ID ou GOOGLE_DRIVE_OAUTH_CLIENT_SECRET não configurados no .env."
            ))
            return

        redirect_uri = f"http://localhost:{porta}/"

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
            "access_type": "offline",
            "prompt": "consent",
        }

        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 70))
        self.stdout.write(self.style.MIGRATE_HEADING("  AUTORIZAÇÃO GOOGLE DRIVE 5 TB (CONTA proj.eng.sw@gmail.com)"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 70 + "\n"))

        self.stdout.write("1. Abrindo o navegador para consentimento da conta Google...")
        self.stdout.write(f"   Link de autorização:\n   {auth_url}\n")
        
        try:
            webbrowser.open(auth_url)
        except Exception:
            self.stdout.write("   (Copie e cole o link acima no seu navegador se ele não abrir automaticamente)")

        self.stdout.write(f"2. Aguardando você autorizar no navegador (escutando na porta {porta})...")

        # Inicia servidor local para capturar o código de retorno
        server_address = ("127.0.0.1", porta)
        try:
            httpd = HTTPServer(server_address, OAuthCallbackHandler)
            httpd.timeout = 120  # 2 minutos para o usuário clicar em Permitir
            httpd.handle_request()
        except OSError as exc:
            self.stdout.write(self.style.WARNING(f"Não foi possível abrir servidor local na porta {porta}: {exc}"))

        codigo = OAuthCallbackHandler.auth_code

        if not codigo:
            self.stdout.write("\nNão recebemos o retorno automático pelo navegador.")
            codigo = input("Se a página do Google exibiu um código ou se você foi redirecionado, cole aqui o código: ").strip()

        if not codigo:
            self.stdout.write(self.style.ERROR("Nenhum código de autorização obtido. Operação cancelada."))
            return

        self.stdout.write(self.style.NOTICE("\n3. Trocando código por Refresh Token de 5 TB com a Google..."))

        token_resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": codigo,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            timeout=15,
        )

        if token_resp.status_code != 200:
            self.stdout.write(self.style.ERROR(
                f"Erro na troca do token (HTTP {token_resp.status_code}): {token_resp.text}"
            ))
            return

        token_data = token_resp.json()
        refresh_token = token_data.get("refresh_token")

        if not refresh_token:
            self.stdout.write(self.style.WARNING(
                "Aviso: Google retornou Access Token, mas não Refresh Token. Se já havia autorizado antes, revogue o app na conta Google ou use prompt=consent."
            ))
            access_token = token_data.get("access_token")
        else:
            self.stdout.write(self.style.SUCCESS("✅ Refresh Token obtido com sucesso!"))

        # Atualiza o arquivo .env com o token
        env_path = os.path.join(settings.BASE_DIR, ".env")
        if not os.path.exists(env_path):
            env_path = os.path.join(str(settings.BASE_DIR.parent), ".env")

        if refresh_token and os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                env_content = f.read()

            if "GOOGLE_DRIVE_REFRESH_TOKEN=" in env_content:
                linhas = env_content.splitlines()
                novas_linhas = []
                for linha in linhas:
                    if linha.startswith("GOOGLE_DRIVE_REFRESH_TOKEN="):
                        novas_linhas.append(f"GOOGLE_DRIVE_REFRESH_TOKEN={refresh_token}")
                    else:
                        novas_linhas.append(linha)
                env_content = "\n".join(novas_linhas) + "\n"
            else:
                env_content += f"\n# Refresh Token da conta proj.eng.sw@gmail.com (5 TB)\nGOOGLE_DRIVE_REFRESH_TOKEN={refresh_token}\n"

            with open(env_path, "w", encoding="utf-8") as f:
                f.write(env_content)

            self.stdout.write(self.style.SUCCESS(f"✅ GOOGLE_DRIVE_REFRESH_TOKEN gravado com sucesso em {env_path}!"))
            os.environ["GOOGLE_DRIVE_REFRESH_TOKEN"] = refresh_token

        # Testa a conexão ao vivo
        from apps.core.storage import GoogleDriveStorageService
        service = GoogleDriveStorageService()
        diag = service.testar_conexao()

        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 70))
        self.stdout.write(self.style.MIGRATE_HEADING("  DIAGNÓSTICO DA CONEXÃO COM O GOOGLE DRIVE 5 TB"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 70))
        self.stdout.write(f"Status Conexão: {diag.get('status_conexao')}")
        self.stdout.write(f"Modo:           {diag.get('modo')}")
        self.stdout.write(f"Conta Ativa:    {diag.get('service_account_email')}")
        
        quota = diag.get("quota")
        if quota:
            limite = int(quota.get("limit", 0)) / (1024 ** 3)
            uso = int(quota.get("usage", 0)) / (1024 ** 3)
            self.stdout.write(self.style.SUCCESS(f"Espaço Total:   {limite:.2f} GB ({limite / 1024:.2f} TB)"))
            self.stdout.write(f"Espaço Usado:   {uso:.2f} GB")

        self.stdout.write(self.style.SUCCESS("\n🎉 Integração com os 5 TB concluída e operacional!\n"))
