#!/bin/bash
# Event:   PostToolUse (Edit or Write)
# What:    Runs TypeScript type-check after any file edit to catch type errors immediately.
# Disable: Remove the "PostToolUse" hook from .claude/settings.json

set -e

cd "$(dirname "$0")/../.." || exit 0

# Only run if a .ts or .tsx file was changed (skip CSS, JSON, MD, etc.)
CHANGED_FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
if [[ "$CHANGED_FILE" != *.ts && "$CHANGED_FILE" != *.tsx ]]; then
  exit 0
fi

echo "→ Running type-check..."
npx tsc --noEmit 2>&1 | head -30

if [ $? -eq 0 ]; then
  echo "✓ Type-check passed"
else
  echo "✗ Type errors detected — fix before committing"
  exit 1
fi
