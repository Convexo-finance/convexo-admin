#!/bin/bash
# Event:   Manual pre-deploy check (run before pushing to Vercel)
# What:    Runs type-check + build to confirm the app will deploy successfully.
# Usage:   bash .claude/hooks/pre-deploy.sh
# Disable: Simply don't run it — this is a manual check, not auto-triggered.

set -e

cd "$(dirname "$0")/../.." || exit 1

echo "=== Convexo Admin — Pre-deploy check ==="

echo ""
echo "1/3 TypeScript check..."
npx tsc --noEmit
echo "✓ Type-check passed"

echo ""
echo "2/3 Production build..."
npm run build
echo "✓ Build succeeded"

echo ""
echo "3/3 Env var check..."
REQUIRED_VARS=(
  "NEXT_PUBLIC_API_URL"
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
  "NEXT_PUBLIC_NETWORK_MODE"
  "NEXT_PUBLIC_PINATA_GATEWAY"
)

MISSING=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "✗ Missing env var: $VAR"
    MISSING=1
  else
    echo "✓ $VAR is set"
  fi
done

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "ERROR: Set missing env vars in .env.local before deploying"
  exit 1
fi

echo ""
echo "=== All checks passed. Ready to deploy. ==="
