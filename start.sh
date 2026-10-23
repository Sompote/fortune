#!/usr/bin/env bash
# One-shot dev launcher: harness (TigrimOS headless) + engine backend + web dev server.
# Logs go to ./logs/. Stop with ./stop.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs
[ -f harness/.env ] || { echo "harness/.env missing — cp harness/.env.example harness/.env and set OPENROUTER_API_KEY"; exit 2; }
set -a; source harness/.env; set +a
( cd engine && npm run build >/dev/null )
( cd harness && ./setup.sh )
( cd harness && nohup ./run.sh > ../logs/harness.log 2>&1 < /dev/null & echo $! > ../logs/harness.pid )
sleep 2
( cd engine && MORDOO_DATA_DIR="$(pwd)/engine/data" TIGRIMOS_URL="http://127.0.0.1:${PORT:-3001}" TIGRIMOS_TOKEN="$ACCESS_TOKEN" nohup node dist/server.js > ../logs/backend.log 2>&1 & echo $! > ../logs/backend.pid )
( cd web && nohup npm run dev -- --host 127.0.0.1 > ../logs/web.log 2>&1 & echo $! > ../logs/web.pid )
sleep 2
echo "harness  : http://127.0.0.1:${PORT:-3001}/web/   (token in harness/.env)"
echo "backend  : http://127.0.0.1:8790/api/health"
echo "web app  : http://127.0.0.1:5173"
echo "logs     : ./logs/*.log"
