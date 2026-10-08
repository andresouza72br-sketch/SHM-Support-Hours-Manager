#!/usr/bin/env python3
"""
SHM Local Dev Mail Server & Web UI
===================================
Servidor SMTP local + Painel Web em tempo real para testes de notificações e e-mails do SHM.
- Não requer nenhuma biblioteca externa (utiliza apenas Python standard library).
- SMTP Server: localhost:1025
- Web UI: http://localhost:8025

Como rodar:
    python tools/mail-server/dev_mail_server.py
    ou: python backend/manage.py run_mail_server
"""

import asyncio
import email
from email import policy
import json
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any

# Garante suporte a UTF-8 no stdout/stderr
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SMTP_HOST = "127.0.0.1"
SMTP_PORT = 1025
HTTP_HOST = "127.0.0.1"
HTTP_PORT = 8025

# Armazenamento em memória dos e-mails capturados
EMAILS: List[Dict[str, Any]] = []
EMAIL_COUNTER = 0


def parse_email_message(raw_bytes: bytes) -> Dict[str, Any]:
    global EMAIL_COUNTER
    EMAIL_COUNTER += 1
    msg = email.message_from_bytes(raw_bytes, policy=policy.default)

    subject = str(msg.get("Subject", "(Sem Assunto)"))
    from_addr = str(msg.get("From", ""))
    to_addr = str(msg.get("To", ""))
    date_header = str(msg.get("Date", ""))

    text_body = ""
    html_body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            if "attachment" not in content_disposition:
                try:
                    payload = part.get_payload(decode=True)
                    charset = part.get_content_charset() or "utf-8"
                    decoded_text = payload.decode(charset, errors="replace")
                    if content_type == "text/plain" and not text_body:
                        text_body = decoded_text
                    elif content_type == "text/html" and not html_body:
                        html_body = decoded_text
                except Exception:
                    pass
    else:
        try:
            payload = msg.get_payload(decode=True)
            charset = msg.get_content_charset() or "utf-8"
            decoded_text = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html_body = decoded_text
            else:
                text_body = decoded_text
        except Exception:
            text_body = str(msg.get_payload())

    now = datetime.now()
    email_data = {
        "id": EMAIL_COUNTER,
        "subject": subject,
        "from": from_addr,
        "to": to_addr,
        "date": date_header or now.strftime("%d/%m/%Y %H:%M:%S"),
        "received_at": now.strftime("%d/%m/%Y %H:%M:%S"),
        "text": text_body,
        "html": html_body or f"<pre style='font-family:sans-serif;white-space:pre-wrap;'>{text_body}</pre>",
        "raw": raw_bytes.decode("utf-8", errors="replace"),
    }
    return email_data


class SMTPServerProtocol(asyncio.Protocol):
    def __init__(self):
        self.transport = None
        self.state = "INIT"
        self.data_buffer = bytearray()
        self.mail_from = ""
        self.rcpt_to = []

    def connection_made(self, transport):
        self.transport = transport
        self.transport.write(b"220 127.0.0.1 SHM Dev Mail Server Ready\r\n")

    def data_received(self, data):
        if self.state == "DATA":
            self.data_buffer.extend(data)
            if b"\r\n.\r\n" in self.data_buffer or self.data_buffer.endswith(b"\r\n.") or self.data_buffer == b".\r\n":
                end_idx = self.data_buffer.find(b"\r\n.\r\n")
                if end_idx != -1:
                    raw_email = bytes(self.data_buffer[:end_idx])
                else:
                    raw_email = bytes(self.data_buffer.rstrip(b".\r\n"))

                try:
                    parsed = parse_email_message(raw_email)
                    EMAILS.insert(0, parsed)
                    print(f"  [SMTP Novo E-mail #{parsed['id']}] Para: {parsed['to']} | Assunto: {parsed['subject']}")
                except Exception as e:
                    print(f"  [SMTP Erro ao processar e-mail]: {e}")

                self.state = "CMD"
                self.data_buffer.clear()
                self.transport.write(b"250 2.0.0 Ok: message queued in memory\r\n")
            return

        lines = data.decode("utf-8", errors="ignore").split("\r\n")
        for line in lines:
            if not line:
                continue
            cmd = line.strip()
            upper = cmd.upper()

            if upper.startswith("HELO") or upper.startswith("EHLO"):
                self.transport.write(b"250-127.0.0.1 Hello\r\n250-8BITMIME\r\n250 OK\r\n")
            elif upper.startswith("MAIL FROM:"):
                self.mail_from = cmd[10:].strip()
                self.transport.write(b"250 2.1.0 Sender Ok\r\n")
            elif upper.startswith("RCPT TO:"):
                self.rcpt_to.append(cmd[8:].strip())
                self.transport.write(b"250 2.1.5 Recipient Ok\r\n")
            elif upper == "DATA":
                self.state = "DATA"
                self.data_buffer.clear()
                self.transport.write(b"354 End data with <CR><LF>.<CR><LF>\r\n")
            elif upper == "RSET":
                self.state = "CMD"
                self.mail_from = ""
                self.rcpt_to.clear()
                self.data_buffer.clear()
                self.transport.write(b"250 2.0.0 Reset Ok\r\n")
            elif upper == "NOOP":
                self.transport.write(b"250 2.0.0 Ok\r\n")
            elif upper == "QUIT":
                self.transport.write(b"221 2.0.0 Bye\r\n")
                self.transport.close()
            else:
                self.transport.write(b"250 2.0.0 Ok\r\n")


HTML_PAGE = """<!DOCTYPE html>
<html lang="pt-BR" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SHM Dev Mail — Monitor de E-mails e Notificações</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-slate-900 text-slate-100 h-full flex flex-col font-sans antialiased overflow-hidden select-none">
  <!-- Top Navigation -->
  <header class="bg-slate-950 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20 text-lg">
        ✉
      </div>
      <div>
        <h1 class="text-sm font-black tracking-tight text-white flex items-center gap-2">
          SHM Dev Mailcatcher
          <span class="text-[10px] uppercase font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            SMTP 127.0.0.1:1025 Ativo
          </span>
        </h1>
        <p class="text-xs text-slate-400">Monitor local de e-mails em tempo real para testes de clientes e usuários</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <span id="counterBadge" class="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700">
        0 e-mails
      </span>
      <button onclick="clearEmails()" class="px-3.5 py-1.5 text-xs font-black bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl transition cursor-pointer flex items-center gap-1.5">
        <span>🗑️ Limpar Caixa</span>
      </button>
      <button onclick="fetchEmails()" class="px-3.5 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5">
        <span>🔄 Atualizar</span>
      </button>
    </div>
  </header>

  <!-- Main Content split view -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Email List -->
    <aside class="w-80 md:w-96 bg-slate-950/70 border-r border-slate-800 flex flex-col shrink-0">
      <div class="p-3 border-b border-slate-800 bg-slate-950">
        <input id="searchInput" type="text" placeholder="Filtrar por destinatário, assunto..." oninput="renderList()"
          class="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div id="emailList" class="flex-1 overflow-y-auto divide-y divide-slate-800/60 select-text">
        <!-- Emails rendered here -->
      </div>
    </aside>

    <!-- Right Email Viewer -->
    <main class="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      <div id="noSelection" class="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <div class="text-4xl mb-2">📫</div>
        <p class="text-sm font-semibold">Nenhum e-mail selecionado</p>
        <p class="text-xs text-slate-600 mt-1 max-w-sm">Quando o SHM disparar convites, aceites de contrato ou notificações, eles aparecerão aqui instantaneamente.</p>
      </div>

      <div id="emailViewer" class="flex-1 hidden flex flex-col overflow-hidden">
        <!-- Header Info -->
        <div class="p-5 bg-slate-950 border-b border-slate-800 space-y-2 select-text shrink-0">
          <div class="flex items-start justify-between gap-4">
            <h2 id="viewSubject" class="text-base font-black text-white leading-snug"></h2>
            <span id="viewTime" class="text-xs font-mono text-slate-400 shrink-0"></span>
          </div>
          <div class="grid grid-cols-1 gap-1 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-400 w-12">Para:</span>
              <span id="viewTo" class="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/60"></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-400 w-12">De:</span>
              <span id="viewFrom" class="text-slate-300"></span>
            </div>
          </div>

          <!-- View Tabs -->
          <div class="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <button id="tabHtml" onclick="setTab('html')" class="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white cursor-pointer">HTML Visual</button>
            <button id="tabText" onclick="setTab('text')" class="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer">Texto Puro</button>
            <button id="tabRaw" onclick="setTab('raw')" class="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer">Raw Headers</button>
          </div>
        </div>

        <!-- Email Body -->
        <div class="flex-1 bg-white relative overflow-hidden">
          <iframe id="htmlFrame" class="w-full h-full border-0 bg-white" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
          <pre id="textFrame" class="hidden w-full h-full p-6 text-xs text-slate-800 bg-slate-50 overflow-auto font-mono whitespace-pre-wrap select-text"></pre>
          <pre id="rawFrame" class="hidden w-full h-full p-6 text-xs text-slate-300 bg-slate-950 overflow-auto font-mono whitespace-pre-wrap select-text"></pre>
        </div>
      </div>
    </main>
  </div>

  <script>
    let allEmails = [];
    let selectedEmail = null;
    let currentTab = 'html';

    async function fetchEmails() {
      try {
        const res = await fetch('/api/emails');
        allEmails = await res.json();
        document.getElementById('counterBadge').innerText = `${allEmails.length} ${allEmails.length === 1 ? 'e-mail' : 'e-mails'}`;
        renderList();
      } catch (err) {
        console.error("Erro ao buscar e-mails:", err);
      }
    }

    async function clearEmails() {
      if (!confirm("Deseja apagar todos os e-mails capturados na sessão?")) return;
      try {
        await fetch('/api/emails', { method: 'DELETE' });
        selectedEmail = null;
        updateViewer();
        fetchEmails();
      } catch (err) {
        console.error("Erro ao limpar e-mails:", err);
      }
    }

    function renderList() {
      const term = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const listEl = document.getElementById('emailList');
      listEl.innerHTML = '';

      const filtered = allEmails.filter(e => {
        if (!term) return true;
        return (e.subject || '').toLowerCase().includes(term) ||
               (e.to || '').toLowerCase().includes(term) ||
               (e.from || '').toLowerCase().includes(term);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="p-6 text-center text-xs text-slate-500 italic">Nenhum e-mail recebido ainda.</div>`;
        return;
      }

      filtered.forEach(email => {
        const isSelected = selectedEmail && selectedEmail.id === email.id;
        const item = document.createElement('div');
        item.className = `p-3.5 cursor-pointer transition border-l-4 ${
          isSelected
            ? 'bg-slate-900 border-indigo-500 text-white'
            : 'bg-transparent border-transparent hover:bg-slate-900/60 text-slate-300'
        }`;
        item.onclick = () => selectEmail(email);
        item.innerHTML = `
          <div class="flex items-center justify-between text-[11px] mb-1">
            <span class="font-mono font-bold text-indigo-400 truncate max-w-[170px]" title="${email.to}">${email.to || 'Sem Destinatário'}</span>
            <span class="text-[10px] text-slate-500 font-mono">${email.received_at.split(' ')[1] || ''}</span>
          </div>
          <div class="text-xs font-bold leading-snug text-slate-100 line-clamp-1 mb-1" title="${email.subject}">
            ${email.subject}
          </div>
          <div class="text-[10px] text-slate-400 truncate">
            De: ${email.from}
          </div>
        `;
        listEl.appendChild(item);
      });
    }

    function selectEmail(email) {
      selectedEmail = email;
      renderList();
      updateViewer();
    }

    function updateViewer() {
      const noSel = document.getElementById('noSelection');
      const viewer = document.getElementById('emailViewer');

      if (!selectedEmail) {
        noSel.classList.remove('hidden');
        viewer.classList.add('hidden');
        return;
      }

      noSel.classList.add('hidden');
      viewer.classList.remove('hidden');

      document.getElementById('viewSubject').innerText = selectedEmail.subject;
      document.getElementById('viewTo').innerText = selectedEmail.to;
      document.getElementById('viewFrom').innerText = selectedEmail.from;
      document.getElementById('viewTime').innerText = selectedEmail.date;

      const iframe = document.getElementById('htmlFrame');
      iframe.srcdoc = selectedEmail.html;

      document.getElementById('textFrame').innerText = selectedEmail.text || '(Sem conteúdo em texto puro)';
      document.getElementById('rawFrame').innerText = selectedEmail.raw || '';

      setTab(currentTab);
    }

    function setTab(tab) {
      currentTab = tab;
      const htmlF = document.getElementById('htmlFrame');
      const textF = document.getElementById('textFrame');
      const rawF = document.getElementById('rawFrame');

      const btnHtml = document.getElementById('tabHtml');
      const btnText = document.getElementById('tabText');
      const btnRaw = document.getElementById('tabRaw');

      [htmlF, textF, rawF].forEach(el => el.classList.add('hidden'));
      [btnHtml, btnText, btnRaw].forEach(el => {
        el.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer';
      });

      if (tab === 'html') {
        htmlF.classList.remove('hidden');
        btnHtml.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white cursor-pointer';
      } else if (tab === 'text') {
        textF.classList.remove('hidden');
        btnText.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white cursor-pointer';
      } else if (tab === 'raw') {
        rawF.classList.remove('hidden');
        btnRaw.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white cursor-pointer';
      }
    }

    // Auto-poll a cada 2 segundos
    setInterval(fetchEmails, 2000);
    fetchEmails();
  </script>
</body>
</html>
"""


class HTTPRequestHandler(asyncio.Protocol):
    def __init__(self):
        self.transport = None
        self.buffer = bytearray()

    def connection_made(self, transport):
        self.transport = transport

    def data_received(self, data):
        self.buffer.extend(data)
        if b"\r\n\r\n" in self.buffer:
            header_bytes = bytes(self.buffer)
            header_str = header_bytes.decode("utf-8", errors="ignore")
            lines = header_str.split("\r\n")
            if not lines:
                return
            req_line = lines[0].split(" ")
            if len(req_line) < 2:
                return
            method, path = req_line[0], req_line[1]

            if method == "GET" and (path == "/" or path.startswith("/index")):
                self.send_response(200, "text/html; charset=utf-8", HTML_PAGE.encode("utf-8"))
            elif method == "GET" and path == "/api/emails":
                payload = json.dumps(EMAILS).encode("utf-8")
                self.send_response(200, "application/json", payload)
            elif method == "DELETE" and path == "/api/emails":
                EMAILS.clear()
                self.send_response(200, "application/json", b'{"status":"cleared"}')
            else:
                self.send_response(404, "text/plain", b"Not Found")

    def send_response(self, status_code: int, content_type: str, body: bytes):
        status_text = "OK" if status_code == 200 else "Not Found"
        headers = (
            f"HTTP/1.1 {status_code} {status_text}\r\n"
            f"Content-Type: {content_type}\r\n"
            f"Content-Length: {len(body)}\r\n"
            f"Connection: close\r\n"
            f"Access-Control-Allow-Origin: *\r\n"
            f"\r\n"
        ).encode("utf-8")
        self.transport.write(headers + body)
        self.transport.close()


async def main():
    loop = asyncio.get_running_loop()

    # 1. Iniciar Servidor SMTP
    smtp_server = await loop.create_server(
        SMTPServerProtocol,
        host=SMTP_HOST,
        port=SMTP_PORT,
    )
    print("=" * 70)
    print("  [*] SHM DEV MAIL SERVER INICIADO COM SUCESSO!")
    print("=" * 70)
    print(f"  [SMTP] Servidor SMTP ativo em:   {SMTP_HOST}:{SMTP_PORT}")
    print(f"  [WEB]  Painel Web disponivel em: http://localhost:{HTTP_PORT}")
    print("-" * 70)
    print("  * Qualquer e-mail disparado pelo backend (qualquer endereco) sera")
    print("    capturado e exibido em tempo real no Painel Web.")
    print("  * Pressione Ctrl+C para encerrar.")
    print("=" * 70)

    # 2. Iniciar Servidor Web
    http_server = await loop.create_server(
        HTTPRequestHandler,
        host=HTTP_HOST,
        port=HTTP_PORT,
    )

    async with smtp_server, http_server:
        await asyncio.gather(
            smtp_server.serve_forever(),
            http_server.serve_forever()
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Servidor de e-mails encerrado]")
