#!/bin/bash
set -e

export NODE_ENV="test"
export DATABASE_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"
export DATABASE_TEST_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"

cd apps/api
npx tsx --test src/controllers/__tests__/commerce-pilot.integration.test.ts
