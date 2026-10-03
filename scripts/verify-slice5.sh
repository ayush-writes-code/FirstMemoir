#!/bin/bash
set -e

echo "🧪 Running Slice 4 Verification First..."
./scripts/verify-slice4.sh

echo "🧪 Running Slice 5 Admin Verification..."
chmod +x scripts/test-slice5.sh
./scripts/test-slice5.sh

echo "🧪 Running check-types..."
npm run check-types

echo "🧪 Building API and Admin..."
npx turbo run build --filter=api --filter=admin

echo "✅ Slice 5 Verification complete!"
