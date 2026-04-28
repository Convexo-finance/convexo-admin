#!/bin/bash
# Event:   Manual (run after completing a meaningful change)
# What:    Reminds Claude to append a CHANGELOG entry. Does NOT auto-write the entry —
#          the content must be meaningful and human-reviewed.
# Usage:   bash .claude/hooks/changelog-update.sh "v1.2" "Added X, fixed Y"
# Disable: Don't run it — this is an advisory script, not blocking.

set -e

cd "$(dirname "$0")/../.." || exit 1

VERSION="${1:-}"
DESCRIPTION="${2:-}"
DATE=$(date +%Y-%m-%d)

if [ -z "$VERSION" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: bash .claude/hooks/changelog-update.sh <version> <description>"
  echo ""
  echo "Current CHANGELOG tail:"
  tail -20 CHANGELOG.md
  exit 1
fi

ENTRY="
## $VERSION — $DATE
- $DESCRIPTION
"

# Prepend after the header (line 3, after "# Changelog" + blank line + description)
TMP=$(mktemp)
head -3 CHANGELOG.md > "$TMP"
echo "$ENTRY" >> "$TMP"
tail -n +4 CHANGELOG.md >> "$TMP"
mv "$TMP" CHANGELOG.md

echo "✓ CHANGELOG.md updated with $VERSION entry"
