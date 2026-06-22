#!/bin/bash
set -euo pipefail

TARGET="${1:-}"
case "$TARGET" in
  local|remote) ;;
  *) echo "usage: $0 <local|remote>" >&2; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$(dirname "$SCRIPT_DIR")/env"
SHARED="$ENV_DIR/.env.shared"
OVERLAY="$ENV_DIR/.env.$TARGET"

for f in "$SHARED" "$OVERLAY"; do
  [ -f "$f" ] || { echo "missing env file: $f" >&2; exit 1; }
done

OUT="$(awk '
  /^[[:space:]]*#/ { next }
  /^[[:space:]]*$/ { next }
  {
    eq = index($0, "=")
    if (eq == 0) next
    key = substr($0, 1, eq - 1)
    val = substr($0, eq + 1)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
    if (!(key in seen)) { order[++n] = key; seen[key] = 1 }
    value[key] = val
  }
  END {
    for (i = 1; i <= n; i++) {
      k = order[i]
      print k "=" value[k]
    }
  }
' "$SHARED" "$OVERLAY")"

for required in DB_HOST APPLICATION_ID MASTER_KEY SERVER_URL; do
  line="$(printf '%s\n' "$OUT" | grep "^${required}=" || true)"
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  if [ -z "$value" ]; then
    echo "build_env: required key $required is empty (target=$TARGET)" >&2
    exit 1
  fi
done

TARGET_UC="$(printf '%s' "$TARGET" | tr '[:lower:]' '[:upper:]')"

cat <<EOF
# ============================================================
# AUTO-GENERATED ENV (TARGET: ${TARGET_UC}). DO NOT EDIT HERE.
# EDIT env/.env.shared AND env/.env.local | env/.env.remote
#
# HOW TO USE:
#   NPM RUN BUILD         -> BUILD LOCAL .env
#   NPM RUN BUILD-REMOTE  -> BUILD REMOTE .env.remote
#   NPM RUN SYNC-ENV      -> SYNC REMOTE ENV TO SERVER
# ============================================================
EOF

printf '%s\n' "$OUT"
