#!/bin/bash

echo "🧹 Tearing down test database container and volumes..."
docker compose -f docker-compose.test.yml down -v

echo "✅ Test environment destroyed."
