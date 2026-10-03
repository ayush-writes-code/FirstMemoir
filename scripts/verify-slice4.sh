#!/bin/bash
set -e

export NODE_ENV="test"
export DATABASE_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"
export DATABASE_TEST_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"

echo "🧪 Running DB setup and seed..."
cd packages/database
npx prisma migrate deploy
npm run db:seed
cd ../..

echo "🧪 Verifying catalog count..."
cd packages/database
node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
prisma.product.count({ where: { sku: { not: null } } }).then(c => {
  if (c < 82) throw new Error('Catalog count is less than 82: ' + c);
  console.log('Catalog count OK: ' + c);
  process.exit(0);
}).catch(console.error);
"
cd ../..

echo "🧪 Running Slice 4 integration test..."
cd apps/api
npx tsx --test src/controllers/__tests__/commerce-pilot.integration.test.ts
cd ../..

echo "🧪 Running existing Slice 3.2 tests..."
cd apps/api
npx tsx --test src/controllers/__tests__/checkout-safety.test.ts
cd ../..

echo "🧪 Running check-types..."
npm run check-types

echo "🧪 Building API and Admin..."
npx turbo run build --filter=api --filter=admin

echo "✅ Verification complete!"
