#!/bin/bash
set -euo pipefail

SERVER="${SERVER:-root@64.226.82.17}"
REMOTE_DIR="${REMOTE_DIR:-/root/notetaker_server}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
KEY_PATH="$ROOT_DIR/private_keys/pushkey.p8"

echo "Target: remote ($SERVER:$REMOTE_DIR)"

bash "$SCRIPT_DIR/build_env.sh" remote > "$ROOT_DIR/.env.tmp"

echo "Ensuring remote dirs..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR/private_keys"

echo "Uploading .env..."
scp "$ROOT_DIR/.env.tmp" "$SERVER:$REMOTE_DIR/.env.tmp"
ssh "$SERVER" "mv $REMOTE_DIR/.env.tmp $REMOTE_DIR/.env"

if [ -f "$KEY_PATH" ]; then
  echo "Uploading APNs key..."
  scp "$KEY_PATH" "$SERVER:$REMOTE_DIR/private_keys/pushkey.p8"
  ssh "$SERVER" "chmod 600 $REMOTE_DIR/private_keys/pushkey.p8"
fi

rm -f "$ROOT_DIR/.env.tmp"

echo "Restarting server..."
ssh "$SERVER" "cd $REMOTE_DIR && pm2 restart ecosystem.config.js --update-env"

echo "Done! Synced to $SERVER:$REMOTE_DIR"
