#!/usr/bin/env bash
# ==============================================================================
# SHM 2.6 - Script de Gestão do Ambiente Local de Desenvolvimento (Linux / Bash)
# Substitui o dev.bat / dev.ps1 no ambiente Linux.
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$ROOT_DIR/.logs"
PIDS_FILE="$LOGS_DIR/pids.json"

mkdir -p "$LOGS_DIR"

ACTION="${1:-status}"
TARGET="${2:-backend}"

# Detecta interpretador python (prioriza .venv se existir)
if [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    PY_BIN="$ROOT_DIR/.venv/bin/python"
elif [ -f "$ROOT_DIR/backend/.venv/bin/python" ]; then
    PY_BIN="$ROOT_DIR/backend/.venv/bin/python"
else
    PY_BIN="$(which python3 || which python)"
fi

# Detecta gerenciador de pacotes do frontend (bun ou npm)
if command -v bun >/dev/null 2>&1; then
    FRONT_CMD="bun run dev"
else
    FRONT_CMD="npm run dev"
fi

get_pid_on_port() {
    local port="$1"
    lsof -ti :"$port" 2>/dev/null || fuser "$port/tcp" 2>/dev/null || true
}

kill_port() {
    local port="$1"
    local pids
    pids=$(get_pid_on_port "$port")
    if [ -n "$pids" ]; then
        echo "Finalizando processo(s) na porta $port: $pids"
        kill -9 $pids 2>/dev/null || true
    fi
}

do_stop() {
    echo "==================================================="
    echo "       Parando servicos SHM no Linux...            "
    echo "==================================================="

    if [ -f "$PIDS_FILE" ]; then
        # Tenta matar por PID registrado
        local b_pid f_pid m_pid
        b_pid=$("$PY_BIN" -c "import json; d=json.load(open('$PIDS_FILE')); print(d.get('BackendPid',''))" 2>/dev/null || true)
        f_pid=$("$PY_BIN" -c "import json; d=json.load(open('$PIDS_FILE')); print(d.get('FrontendPid',''))" 2>/dev/null || true)
        m_pid=$("$PY_BIN" -c "import json; d=json.load(open('$PIDS_FILE')); print(d.get('MailPid',''))" 2>/dev/null || true)

        [ -n "$b_pid" ] && kill -9 "$b_pid" 2>/dev/null || true
        [ -n "$f_pid" ] && kill -9 "$f_pid" 2>/dev/null || true
        [ -n "$m_pid" ] && kill -9 "$m_pid" 2>/dev/null || true
        rm -f "$PIDS_FILE"
    fi

    # Garante liberação de portas
    kill_port 8001
    kill_port 5173
    kill_port 8025
    kill_port 1025

    echo "Todos os servicos foram finalizados com sucesso."
}

do_status() {
    echo "==================================================="
    echo "           Status dos Servicos SHM (Linux)         "
    echo "==================================================="

    # Checa containers Docker
    if command -v docker >/dev/null 2>&1 && docker compose ps --filter "status=running" 2>/dev/null | grep -q "shm-"; then
        echo -e " \033[36m[DOCKER]\033[0m   Stack Containerizada ATIVA (docker compose)"
        docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | tail -n +2 | while read -r line; do
            echo -e "           -> $line"
        done
        echo "---------------------------------------------------"
    fi

    # Teste de conectividade nas portas
    if curl -s --max-time 1 http://127.0.0.1:8001/api/v1/status/ >/dev/null 2>&1; then
        local status_res
        status_res=$(curl -s --max-time 2 http://127.0.0.1:8001/api/v1/status/ 2>/dev/null || true)
        echo -e " \033[32m[ONLINE]\033[0m  Backend Django  -> http://localhost:8001"
        echo -e "           Health: $status_res"
    else
        echo -e " \033[31m[OFFLINE]\033[0m Backend Django  -> Porta 8001 livre"
    fi

    if curl -sI --max-time 1 http://127.0.0.1:5173/ >/dev/null 2>&1; then
        echo -e " \033[32m[ONLINE]\033[0m  Frontend SPA    -> http://localhost:5173"
    else
        echo -e " \033[31m[OFFLINE]\033[0m Frontend SPA    -> Porta 5173 livre"
    fi

    if curl -sI --max-time 1 http://127.0.0.1:8025/ >/dev/null 2>&1; then
        echo -e " \033[32m[ONLINE]\033[0m  Mail Dev Server -> http://localhost:8025 (SMTP: 1025)"
    else
        echo -e " \033[33m[OFFLINE]\033[0m Mail Dev Server -> Portas 1025/8025 livres"
    fi

    echo "---------------------------------------------------"
    # Teste DNS Local e Caddy Proxy
    if curl -sI --max-time 2 http://shm.home/ >/dev/null 2>&1; then
        echo -e " \033[32m[ROTEADO]\033[0m Dominio Local   -> \033[1;32mhttp://shm.home\033[0m (Caddy + DNS Hub)"
        echo -e " \033[32m[ROTEADO]\033[0m HTTPS Seguro    -> \033[1;32mhttps://shm.home\033[0m (TLS Interno)"
    fi

    echo "---------------------------------------------------"
    for log_name in "backend.log" "frontend.log" "mail.log"; do
        local lpath="$LOGS_DIR/$log_name"
        if [ -f "$lpath" ]; then
            local size
            size=$(du -h "$lpath" | cut -f1)
            echo " Log $log_name: $size"
        fi
    done
    echo "==================================================="
}

do_start() {
    echo "==================================================="
    echo "   Iniciando SHM (Backend + Frontend + MailDev)    "
    echo "==================================================="

    # Limpeza preventiva
    do_stop >/dev/null 2>&1 || true
    sleep 1

    echo "[1/3] Iniciando Backend Django na porta 8001..."
    (cd "$ROOT_DIR" && "$PY_BIN" backend/manage.py runserver 0.0.0.0:8001 > "$LOGS_DIR/backend.log" 2> "$LOGS_DIR/backend.err.log") &
    BACKEND_PID=$!

    echo "[2/3] Iniciando Frontend React na porta 5173..."
    (cd "$ROOT_DIR/frontend" && $FRONT_CMD > "$LOGS_DIR/frontend.log" 2> "$LOGS_DIR/frontend.err.log") &
    FRONTEND_PID=$!

    echo "[3/3] Iniciando Servidor de E-mail Local na porta 8025 / 1025..."
    (cd "$ROOT_DIR" && "$PY_BIN" tools/mail-server/dev_mail_server.py > "$LOGS_DIR/mail.log" 2> "$LOGS_DIR/mail.err.log") &
    MAIL_PID=$!

    cat <<EOF > "$PIDS_FILE"
{
  "BackendPid": $BACKEND_PID,
  "FrontendPid": $FRONTEND_PID,
  "MailPid": $MAIL_PID
}
EOF

    sleep 2
    do_status
}

do_logs() {
    local target="$1"
    local logfile="$LOGS_DIR/backend.log"
    if [[ "$target" == *"front"* ]]; then
        logfile="$LOGS_DIR/frontend.log"
    elif [[ "$target" == *"mail"* ]]; then
        logfile="$LOGS_DIR/mail.log"
    fi

    if [ -f "$logfile" ]; then
        echo "Exibindo ultimas linhas de $logfile (Ctrl+C para sair)..."
        tail -n 30 -f "$logfile"
    else
        echo "Arquivo de log nao encontrado em $logfile"
    fi
}

do_backup_db() {
    local backup_dir="$ROOT_DIR/backend/backups"
    mkdir -p "$backup_dir"
    local ts
    ts=$(date +"%Y%m%d_%H%M%S")
    local src="$ROOT_DIR/backend/db.sqlite3"
    local dest="$backup_dir/db_${ts}.sqlite3"

    if [ -f "$src" ]; then
        cp "$src" "$dest"
        echo "==================================================="
        echo " [BACKUP] Base SQLite salva com sucesso!"
        echo " Arquivo: $dest"
        echo "==================================================="
    else
        echo "Arquivo de banco nao encontrado em $src"
    fi
}

do_reset_db() {
    echo "Criando backup preventivo antes do reset..."
    do_backup_db
    echo "Executando seed_base_limpa.py..."
    "$PY_BIN" "$ROOT_DIR/tools/database/seed_base_limpa.py"
    echo "Banco resetado com sucesso para base limpa."
}

case "$ACTION" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_stop
        sleep 1
        do_start
        ;;
    status)
        do_status
        ;;
    logs)
        do_logs "$TARGET"
        ;;
    backup-db)
        do_backup_db
        ;;
    reset-db)
        do_reset_db
        ;;
    *)
        echo "Uso: ./dev.sh {start|stop|restart|status|logs [target]|backup-db|reset-db}"
        exit 1
        ;;
esac
