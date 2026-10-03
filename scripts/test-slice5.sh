#!/bin/bash
export NODE_ENV="test"
export DATABASE_TEST_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"
export DATABASE_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"

cd apps/api
npx tsx --test src/controllers/__tests__/admin.verification.integration.test.ts
