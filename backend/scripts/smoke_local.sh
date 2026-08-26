#!/usr/bin/env bash
# Full ingest-and-query cycle against a running backend. Used by
# prove_local.sh; runnable on its own against the default port.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-http://127.0.0.1:8000}"
exec .venv/bin/python - "$BASE" <<'PYEOF'
import json
import sys
import time

import httpx

base = sys.argv[1]
client = httpx.Client(timeout=httpx.Timeout(connect=5, read=240, write=30, pool=5))

for _ in range(60):
    try:
        if client.get(base + "/api/health").json()["status"] == "ready":
            break
    except Exception:
        pass
    time.sleep(0.5)
else:
    sys.exit("backend never became ready")

with open("test-documents/techcorp-employee-handbook.md", "rb") as fh:
    up = client.post(
        base + "/api/documents/upload",
        files={"file": ("techcorp-employee-handbook.md", fh, "text/markdown")},
    )
assert up.status_code == 200, up.text
print("uploaded:", up.json()["chunks"], "chunks")


def ask(message):
    events = []
    with client.stream("POST", base + "/api/chat", json={"message": message}) as resp:
        assert resp.status_code == 200, resp.read()
        for line in resp.iter_lines():
            if line.startswith("data: "):
                data = line[len("data: ") :]
                if data == "[DONE]":
                    break
                events.append(json.loads(data))
    text = "".join(e.get("content") or "" for e in events if e["type"] == "token")
    done = next(e["done"] for e in events if e["type"] == "done")
    return text, done


text, done = ask("Who is the CTO?")
print("Q1 grounded:", done["grounded"], "| cited:", done["cited"], "|", text[:80].replace("\n", " "))
assert done["grounded"], "CTO answer was not grounded"

text, done = ask("What is the laptop security policy when working in public places?")
print("Q2 grounded:", done["grounded"], "| cited:", done["cited"], "|", text[:80].replace("\n", " "))
assert done["retrieved"] > 0

deleted = client.post(base + "/api/documents/delete", json={"source": "techcorp-employee-handbook.md"})
assert deleted.status_code == 200
print("smoke: PASS")
PYEOF
