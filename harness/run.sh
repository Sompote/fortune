#!/usr/bin/env bash
# Starts the TigrimOS harness headless with THIS folder's data/ (your global TigrimOS data is untouched).
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "harness/.env missing"; exit 2; }
set -a; source .env; set +a
[ -f data/settings.json ] || ./setup.sh
BIN="${TIGRIMOS_BIN:-/Users/sompoteyouwai/ENV3/structure_pondus/pondus/target/release/tigrimos}"
[ -x "$BIN" ] || { echo "TigrimOS binary not found at $BIN"; exit 2; }
export ACCESS_TOKEN PORT="${PORT:-3001}" SANDBOX_DIR="$(pwd)/sandbox"
exec "$BIN" --headless < /dev/null
