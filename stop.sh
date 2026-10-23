#!/usr/bin/env bash
cd "$(dirname "$0")"
for p in web backend harness; do
  [ -f logs/$p.pid ] && { kill "$(cat logs/$p.pid)" 2>/dev/null && echo "stopped $p"; rm -f logs/$p.pid; }
done
# Fallback: the harness is exec'd from run.sh, so match the binary and this folder's sandbox.
pkill -f "tigrimos --headless" 2>/dev/null && echo "stopped harness (by name)"
pkill -f "node dist/server.js" 2>/dev/null && echo "stopped backend (by name)"
exit 0
