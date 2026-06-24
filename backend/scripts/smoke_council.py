"""Live smoke for the typed /ws/council endpoint (in-process, no swarm).

Drives the WS via Starlette TestClient and prints the typed message sequence:
phase -> boundaries -> statement* -> verdict -> done.

Run: python scripts/smoke_council.py
"""

import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agents"))

from starlette.testclient import TestClient  # noqa: E402

from apps.api.gateway import create_app  # noqa: E402


def main():
    app = create_app()
    counts = Counter()
    with TestClient(app) as client:
        with client.websocket_connect("/ws/council") as ws:
            ws.send_json({"topic": "中西區要不要在週末辦一個共同的封街市集？"})
            while True:
                msg = ws.receive_json()
                t = msg.get("type")
                counts[t] += 1
                if t == "phase":
                    print(f"[phase] {msg['phase']}")
                elif t == "boundaries":
                    print(f"[boundaries] {len(msg['data'])} 里")
                elif t == "statement":
                    d = msg["data"]
                    print(f"  [{d['street_name']}|{d['stance']}] {d['text'][:42]}")
                elif t == "verdict":
                    d = msg["data"]
                    print(f"[verdict] alignments={len(d['alignments'])}")
                    print("  summary:", d["tudigong_summary"][:90])
                elif t == "error":
                    print("[error]", msg["message"])
                    break
                elif t == "done":
                    print("[done]")
                    break
    print("\nmessage counts:", dict(counts))


if __name__ == "__main__":
    main()
