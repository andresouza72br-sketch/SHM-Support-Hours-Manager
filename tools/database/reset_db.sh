#!/usr/bin/env bash
# ==============================================================================
# SHM 2.6 -- Reset Completo e Semeadura de Base de Testes Limpa (Linux / Bash)
# Substitui o reset_db.ps1 no ambiente Linux.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

FORCE=false
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    FORCE=true
fi

echo "=================================================================="
echo "  SHM 2.6 -- Reset Completo e Semeadura de Base de Testes Limpa   "
echo "=================================================================="

if [ "$FORCE" = false ]; then
    echo ""
    echo -e "\033[31mAVISO DE SEGURANCA: Esta operacao zera o banco de dados SQLite e anexos.\033[0m"
    echo -e "\033[33mSe você possui dados reais de clientes cadastrados, eles serao perdidos!\033[0m"
    read -p "Deseja REALMENTE prosseguir com o reset? Digite 'RESET' para confirmar: " resposta
    if [ "$resposta" != "RESET" ]; then
        echo -e "\033[32mOperacao cancelada pelo usuario. Dados mantidos intactos.\033[0m"
        exit 0
    fi
fi

# 1. Localizacao do Python
if [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    PY_BIN="$ROOT_DIR/.venv/bin/python"
elif [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PY_BIN="$BACKEND_DIR/.venv/bin/python"
else
    PY_BIN="$(which python3 || which python)"
fi

# 2. Interromper processos na porta 8001
echo ""
echo "[1/6] Verificando e liberando locks no banco SQLite..."
PIDS_8001=$(lsof -ti :8001 2>/dev/null || fuser 8001/tcp 2>/dev/null || true)
if [ -n "$PIDS_8001" ]; then
    echo "  -> Encerrando processos na porta 8001: $PIDS_8001"
    kill -9 $PIDS_8001 2>/dev/null || true
    sleep 1
fi

# 3. Higienizacao remota preventiva da Google Calendar API
echo ""
echo "[2/6] Higienizando eventos anteriores do SHM na Google Calendar API..."
"$PY_BIN" -c "import os, sys, django; sys.path.insert(0, '$BACKEND_DIR'); os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); django.setup(); from apps.schedule.google_service import GoogleCalendarService; res = GoogleCalendarService().limpar_eventos_shm(); print('  -> Removidos da nuvem:', res.get('removidos', 0))" 2>/dev/null || echo "  -> Google Calendar API offline ou sem credenciais, ignorando."

# 4. Backup Preventivo e Remocao dos arquivos fisicos do SQLite
echo ""
echo "[3/6] Criando backup de seguranca e limpando banco anterior..."
BACKUP_DIR="$BACKEND_DIR/backups"
mkdir -p "$BACKUP_DIR"
MAIN_DB="$BACKEND_DIR/db.sqlite3"
if [ -f "$MAIN_DB" ]; then
    TS=$(date +"%Y%m%d_%H%M%S")
    SAFE_BAK="$BACKUP_DIR/db_pre_reset_${TS}.sqlite3"
    cp "$MAIN_DB" "$SAFE_BAK"
    echo "  -> Backup preventivo salvo em: $SAFE_BAK"
fi

rm -f "$MAIN_DB"
rm -f "$BACKEND_DIR"/db.sqlite3-shm
rm -f "$BACKEND_DIR"/db.sqlite3-wal

# 5. Aplicar Migrations Django do Zero
echo ""
echo "[4/6] Recriando esquema do banco relacional via Django Migrations..."
"$PY_BIN" "$BACKEND_DIR/manage.py" migrate --noinput

# 6. Executar Semeadura com a Base Limpa
echo ""
echo "[5/6] Populando banco com dados de teste estruturados (seed_base_limpa.py)..."
"$PY_BIN" "$ROOT_DIR/tools/database/seed_base_limpa.py"

echo ""
echo "[6/6] Higienizando diretorios de midia e uploads..."
mkdir -p "$BACKEND_DIR/media/branding"
mkdir -p "$BACKEND_DIR/media/clientes"
mkdir -p "$BACKEND_DIR/media/contratos"

echo ""
echo "=================================================================="
echo "  [SUCESSO] Base de dados do SHM resetada e pronta para testes!   "
echo "=================================================================="
