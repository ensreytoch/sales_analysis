#!/bin/bash

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-Admin}"
DB_NAME="${DB_NAME:-sundery_sales}"
CONTAINER_NAME="sundery_db_dev"

# ── Start project PostgreSQL ───────────────────────────────────────────────────
echo "==> Starting project PostgreSQL on port ${DB_PORT}..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_USER="${DB_USER}" \
    -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
    -e POSTGRES_DB="${DB_NAME}" \
    -p "${DB_PORT}:5432" \
    postgres:16-alpine > /dev/null

  echo "    Waiting for PostgreSQL to be ready..."
  until docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" > /dev/null 2>&1; do
    sleep 1
  done
  echo "    ✓ PostgreSQL is ready."
else
  echo "    ✓ Container '${CONTAINER_NAME}' already running."
fi

# ── Install dependencies ───────────────────────────────────────────────────────
echo ""
echo "==> Installing dependencies..."

if [ ! -d "backend/node_modules" ]; then
  echo "    [backend] npm install..."
  (cd backend && npm install)
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "    [frontend] npm install..."
  (cd frontend && npm install)
fi

# ── Flyway Migrations ─────────────────────────────────────────────────────────
echo ""
echo "==> Running Flyway migrations..."

if command -v wslpath &>/dev/null; then
  MIGRATIONS_PATH="$(wslpath -m "$(pwd)")/backend/db/migrations"
elif command -v cygpath &>/dev/null; then
  MIGRATIONS_PATH="$(cygpath -m "$(pwd)")/backend/db/migrations"
else
  MIGRATIONS_PATH="$(pwd)/backend/db/migrations"
fi

docker run --rm \
  --network host \
  -v "${MIGRATIONS_PATH}:/flyway/sql" \
  flyway/flyway:10-alpine \
  -url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  -user="${DB_USER}" \
  -password="${DB_PASSWORD}" \
  -locations="filesystem:/flyway/sql" \
  -connectRetries=5 \
  migrate

if [ $? -ne 0 ]; then
  echo "x Flyway migration failed."
  exit 1
fi

echo "✓ Migrations applied successfully."

# ── Seed CSV Data ─────────────────────────────────────────────────────────────
echo ""
echo "==> Seeding data from cleaned_transactions.csv..."
(cd backend && npm run seed)

if [ $? -ne 0 ]; then
  echo "x Seeding failed."
  exit 1
fi

# ── Seed Auth ─────────────────────────────────────────────────────────────────
echo ""
echo "==> Seeding auth (roles, permissions, users)..."
(cd backend && npm run seed:auth)

if [ $? -ne 0 ]; then
  echo "x Auth seeding failed."
  exit 1
fi

# ── Start Servers ─────────────────────────────────────────────────────────────
echo ""
echo "==> Starting backend and frontend..."
echo "    Backend  -> http://localhost:5000"
echo "    Frontend -> http://localhost:5173"
echo "    Press Ctrl+C to stop both."
echo ""

(cd backend && npm run dev) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
