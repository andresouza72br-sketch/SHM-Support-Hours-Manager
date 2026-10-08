#!/bin/sh
set -e

echo "==> [SHM Backend] Inicializando container..."

# Se estiver configurado para Postgres, aguarda o banco estar disponível
if [ -n "$POSTGRES_HOST" ]; then
    echo "==> Aguardando PostgreSQL em $POSTGRES_HOST:${POSTGRES_PORT:-5432}..."
    while ! nc -z "$POSTGRES_HOST" "${POSTGRES_PORT:-5432}" 2>/dev/null; do
        sleep 1
    done
    echo "==> PostgreSQL conectado com sucesso!"
fi

echo "==> Aplicando migrations..."
python manage.py migrate --noinput

echo "==> Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

echo "==> Iniciando aplicação..."
exec "$@"
