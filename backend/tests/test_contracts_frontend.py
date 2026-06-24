"""Unit tests for the frontend-facing payload mappers."""

from deg.contracts_frontend import (
    bidding_to_agent_event,
    debate_to_agent_event,
    itinerary_to_days,
    poi_to_spot,
)
from deg.schemas import BiddingProposal, DebateMessage, ItineraryStop, LatLng, Poi


def _poi(name: str = "赤崁樓", lat: float = 22.99, lng: float = 120.20) -> Poi:
    return Poi(name=name, category="古蹟", location=LatLng(lat=lat, lng=lng),
               tags=["必訪"], note="荷蘭時期古蹟")


def test_poi_to_spot_shape():
    spot = poi_to_spot(_poi(), "赤嵌里")
    assert spot["name"] == "赤崁樓"
    assert spot["district"] == "中西區"
    assert spot["village"] == "赤嵌里"
    assert spot["lat"] == 22.99 and spot["lng"] == 120.20
    assert "古蹟" in spot["tags"] and "必訪" in spot["tags"]
    assert spot["description"] == "荷蘭時期古蹟"


def test_poi_to_spot_context_overrides():
    spot = poi_to_spot(_poi(), "赤嵌里", open_hours="建議停留 60 分鐘", description="先逛古蹟")
    assert spot["openHours"] == "建議停留 60 分鐘"
    assert spot["description"] == "先逛古蹟"


def test_itinerary_to_days_groups_and_orders():
    stops = [
        ItineraryStop(day=1, poi=_poi("赤崁樓"), agent_id="a1", duration_mins=60,
                      activity="逛古蹟", transit_to_next="步行5分"),
        ItineraryStop(day=1, poi=_poi("神農街"), agent_id="a2", duration_mins=90,
                      activity="喝咖啡", transit_to_next=None),
        ItineraryStop(day=2, poi=_poi("林百貨"), agent_id="a1", duration_mins=45,
                      activity="逛街", transit_to_next=None),
    ]
    days = itinerary_to_days(stops, {"a1": "赤嵌里", "a2": "神農里"})
    assert [d["day"] for d in days] == [1, 2]
    day1 = days[0]
    assert len(day1["items"]) == 2
    assert day1["items"][0]["order"] == 1
    assert day1["items"][0]["spot"]["village"] == "赤嵌里"
    assert day1["items"][0]["spot"]["openHours"] == "建議停留 60 分鐘"
    assert day1["items"][0]["spot"]["description"] == "逛古蹟"
    assert day1["items"][0]["note"] == "步行5分"
    # day 2 uses a1's name too
    assert days[1]["items"][0]["spot"]["village"] == "赤嵌里"


def test_bidding_to_agent_event_readable_with_spot():
    bid = BiddingProposal(
        agent_id="a1", task_id="t1", fitness_score=8.0,
        reasoning="赤嵌里有最棒的古蹟群，適合你",
        spatial_data=LatLng(lat=22.99, lng=120.20),
        candidate_pois=[_poi("赤崁樓")],
    )
    ev = bidding_to_agent_event(bid, "赤嵌里")
    assert ev["type"] == "agent_event"
    assert ev["agent_name"] == "赤嵌里"
    assert ev["text"] == "赤嵌里有最棒的古蹟群，適合你"
    assert ev["attachedSpot"]["name"] == "赤崁樓"
    # readable text must NOT be JSON
    assert not ev["text"].strip().startswith("{")


def test_debate_to_agent_event_readable():
    deb = DebateMessage(agent_id="a2", debate_text="我反對，神農街才是文青首選")
    ev = debate_to_agent_event(deb, "神農里")
    assert ev["text"] == "我反對，神農街才是文青首選"
    assert "attachedSpot" not in ev
