"""Smoke tests for the frontend-facing endpoints that need no LLM/swarm:
- /health, /fortune/itinerary (real POIs), and the divination prompt builder.
Route registration for the LLM/streaming endpoints is also asserted.
"""

from fastapi.testclient import TestClient

from apps.api.gateway import create_app
from divination.agent import GODS, build_divination_prompt


def test_routes_registered():
    app = create_app()
    paths = {r.path for r in app.routes}
    for p in ("/ws/explore", "/ws/council", "/fortune/itinerary", "/divination",
              "/wish", "/dashboard/summary"):
        assert p in paths


def test_health():
    with TestClient(create_app()) as c:
        assert c.get("/health").json() == {"status": "ok"}


def test_fortune_itinerary_returns_real_spots():
    with TestClient(create_app()) as c:
        body = c.get("/fortune/itinerary").json()
    assert body["grade"]
    assert isinstance(body["poem"], list)
    assert 2 <= len(body["spots"]) <= 3
    for spot in body["spots"]:
        assert spot["name"] and spot["district"] == "中西區"
        assert isinstance(spot["lat"], float) and isinstance(spot["lng"], float)
        assert spot["village"]  # real 里 name


def test_divination_prompt_builder_targets_god_and_poe():
    prompt = build_divination_prompt("yuelao", "感情運如何？", "sheng")
    assert "月老" in prompt
    assert "感情運如何？" in prompt
    assert "聖筊" in prompt
    assert "DivinationReading" in prompt


def test_divination_prompt_unknown_god_falls_back_to_tudigong():
    prompt = build_divination_prompt("nonexistent", "問事", "xiao")
    assert "土地公" in prompt
    assert set(GODS) == {"tudigong", "yuelao", "mazu", "caishen", "guandi", "guanyin"}
