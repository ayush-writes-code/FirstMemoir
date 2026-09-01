#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔍 Checking Docker availability..."
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "❌ Error: Docker is unavailable."
  echo "The integration tests require a PostgreSQL database running via Docker."
  echo "Please ensure Docker (e.g. Docker Desktop, Colima) is installed and the daemon is running."
  echo ""
  exit 1
fi
echo "✅ Docker is running."

echo "🚀 Starting test database container..."
# Using --wait requires a healthcheck in the docker-compose file
docker compose -f docker-compose.test.yml up -d --wait

echo "🗄️ Initializing test database schema..."
# We explicitly set DATABASE_URL to target the test database to prevent touching dev/prod.
# We use migrate deploy because the repository uses committed migration files, ensuring
# the test schema perfectly matches the production migration path.
export DATABASE_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"
cd packages/database
npx prisma migrate deploy

echo "✅ Test environment is ready!"
