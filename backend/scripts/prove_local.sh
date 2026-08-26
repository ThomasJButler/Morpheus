#!/usr/bin/env bash
# Proof of locality (docs/audit/05-proof-of-locality.md).
#
# Runs the backend under a macOS kernel sandbox that denies every network
# connection except loopback, drives a full ingest-and-query cycle against
# the real Ollama, and samples lsof for both processes the whole time.
# Exits non-zero if the smoke fails or any non-loopback endpoint appears.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8130}"
PROFILE="scripts/loopback-only.sb"

echo "== sanity: the sandbox actually blocks egress =="
if sandbox-exec -f "$PROFILE" curl -s -m 4 https://ollama.com -o /dev/null 2>/dev/null; then
  echo "FAIL: sandbox did not block an outbound request"; exit 1
fi
echo "outbound request blocked (good)"

curl -s -m 2 http://127.0.0.1:11434/api/version >/dev/null \
  || { echo "Ollama is not running on 127.0.0.1:11434"; exit 1; }

echo "== starting the backend under the sandbox =="
sandbox-exec -f "$PROFILE" .venv/bin/python -m uvicorn app.main:app \
  --port "$PORT" --log-level warning &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT
OLLAMA_PID="$(pgrep -x ollama | head -1 || true)"
PIDS="$BACKEND_PID${OLLAMA_PID:+,$OLLAMA_PID}"

ENDPOINTS="$(mktemp)"
(
  while kill -0 "$BACKEND_PID" 2>/dev/null; do
    lsof -a -i -n -P -p "$PIDS" 2>/dev/null | awk 'NR>1 {print $9}' >> "$ENDPOINTS"
    sleep 0.5
  done
) &
SAMPLER_PID=$!

if scripts/smoke_local.sh "http://127.0.0.1:$PORT"; then SMOKE=0; else SMOKE=$?; fi

{ kill "$BACKEND_PID" 2>/dev/null; wait "$BACKEND_PID"; } 2>/dev/null || true
{ kill "$SAMPLER_PID" 2>/dev/null; wait "$SAMPLER_PID"; } 2>/dev/null || true

echo "== remote endpoints observed (backend + ollama, sampled every 0.5s) =="
REMOTES="$(awk -F'->' '/->/ {print $2}' "$ENDPOINTS" | cut -d' ' -f1 | sort -u)"
if [ -n "$REMOTES" ]; then echo "$REMOTES"; else echo "<none>"; fi
BAD="$(printf '%s\n' "$REMOTES" | grep -vE '^(127\.|\[::1\]|$)' || true)"

if [ "$SMOKE" -ne 0 ]; then echo "FAIL: smoke run failed"; exit 1; fi
if [ -n "$BAD" ]; then echo "FAIL: non-loopback endpoints: $BAD"; exit 1; fi
echo "PASS: full ingest-and-query cycle, loopback only, under a kernel sandbox"
