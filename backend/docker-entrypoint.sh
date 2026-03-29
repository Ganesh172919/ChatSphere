#!/bin/sh
set -eu

MAX_RETRIES="${PRISMA_MIGRATE_MAX_RETRIES:-20}"
SLEEP_SECONDS="${PRISMA_MIGRATE_RETRY_DELAY_SECONDS:-3}"
ATTEMPT=1
DB_WAIT_MAX_RETRIES="${DB_WAIT_MAX_RETRIES:-40}"
DB_WAIT_DELAY_SECONDS="${DB_WAIT_DELAY_SECONDS:-2}"

extract_db_host() {
  node -e 'const url = new URL(process.env.DATABASE_URL); process.stdout.write(url.hostname);'
}

extract_db_port() {
  node -e 'const url = new URL(process.env.DATABASE_URL); process.stdout.write(String(url.port || "5432"));'
}

wait_for_db_tcp() {
  node -e '
    const net = require("net");
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT);
    const socket = net.createConnection({ host, port });
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.end();
      process.exit(0);
    });
    socket.on("timeout", () => {
      socket.destroy();
      process.exit(1);
    });
    socket.on("error", () => process.exit(1));
  '
}

run_migrate() {
  npx prisma migrate deploy
}

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

DB_HOST="$(extract_db_host)"
DB_PORT="$(extract_db_port)"
export DB_HOST DB_PORT

DB_WAIT_ATTEMPT=1
until wait_for_db_tcp; do
  if [ "$DB_WAIT_ATTEMPT" -ge "$DB_WAIT_MAX_RETRIES" ]; then
    echo "Database TCP endpoint ${DB_HOST}:${DB_PORT} is unreachable after ${DB_WAIT_ATTEMPT} attempts."
    exit 1
  fi

  echo "Waiting for database TCP endpoint ${DB_HOST}:${DB_PORT} (${DB_WAIT_ATTEMPT}/${DB_WAIT_MAX_RETRIES})..."
  DB_WAIT_ATTEMPT=$((DB_WAIT_ATTEMPT + 1))
  sleep "$DB_WAIT_DELAY_SECONDS"
done

until run_migrate; do
  if [ "$ATTEMPT" -ge "$MAX_RETRIES" ]; then
    echo "Prisma migration failed after ${ATTEMPT} attempts."
    exit 1
  fi

  echo "Prisma migration attempt ${ATTEMPT}/${MAX_RETRIES} failed. Retrying in ${SLEEP_SECONDS}s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Prisma migration complete. Starting backend..."
exec node dist/server.js
