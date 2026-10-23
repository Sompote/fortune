#!/usr/bin/env bash
# Generates harness/data/settings.json from harness/.env so the API key never lives in git.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "harness/.env missing — copy .env.example and fill in OPENROUTER_API_KEY"; exit 2; }
set -a; source .env; set +a
ENGINE="$(cd ../engine && pwd)"
MODEL="${MORDOO_MODEL:-anthropic/claude-sonnet-4.5}"
EXTRA="${MORDOO_LLM_EXTRA_BODY:-}"
[ -z "$EXTRA" ] && EXTRA='{"reasoning": {"effort": "low"}}'
mkdir -p data/agent_loops data/agents data/graph data/tools sandbox
cat > data/settings.json <<JSON
{
  "tigerBotApiKey": "${OPENROUTER_API_KEY}",
  "tigerBotApiUrl": "https://openrouter.ai/api/v1",
  "tigerBotModel": "${MODEL}",
  "agentLoopProfile": "mordoo",
  "llmExtraBody": ${EXTRA},
  "subAgentEnabled": false,
  "approvalRequiredForShell": true,
  "approvalRequiredForPython": true,
  "approvalRequiredForFileWrite": true,
  "approvalRequiredForFileDelete": true,
  "skillAutoUpdateEnabled": false,
  "mcpTools": [
    {
      "name": "horathai",
      "enabled": true,
      "type": "stdio",
      "url": "",
      "command": "node",
      "args": ["${ENGINE}/dist/mcp.js"],
      "env": { "MORDOO_DATA_DIR": "${ENGINE}/data" }
    }
  ]
}
JSON
echo "wrote data/settings.json (model ${MODEL}, MCP → ${ENGINE}/dist/mcp.js)"
