"""Unit tests for the conversational-explore helpers that need no LLM:
session itinerary payload, remove/replace by frontend item id, replacement
suggestions, and spot-id resolution against real 里 data."""

from apps.api.gateway import (
    _ExploreSession,
    _find_poi_by_spot_id,
    _remove_stop,
    _replacement_suggestions,
)
from deg.schemas import ItineraryStop, LatLng, Poi


def _stop(name: str, day: int, agent_id: str = "street_chikan_node",
          lat: float = 22.99, lng: float = 120.20) -> ItineraryStop:
    return ItineraryStop(
        day=day, poi=Poi(name=name, category="景點", location=LatLng(lat=lat, lng=lng)),
        agent_id=agent_id, duration_mins=60, activity=f"造訪{name}", transit_to_next=None,
    )


def test_session_days_payload_shape():
    s = _ExploreSession()
    s.itinerary = [_stop("赤崁樓", 1), _stop("神農街", 1), _stop("林百貨", 2)]
    days = s.days_payload()
    assert [d["day"] for d in days] == [1, 2]
    assert days[0]["items"][0]["id"] == "stop-1-1"
    assert days[0]["items"][1]["id"] == "stop-1-2"
    assert days[1]["items"][0]["id"] == "stop-2-1"


def test_remove_stop_by_item_id():
    itinerary = [_stop("赤崁樓", 1), _stop("神農街", 1), _stop("林百貨", 1)]
    removed = _remove_stop(itinerary, "stop-1-2")  # the 2nd stop of day 1
    assert removed is not None and removed.poi.name == "神農街"
    assert [s.poi.name for s in itinerary] == ["赤崁樓", "林百貨"]


def test_remove_stop_bad_id_is_noop():
    itinerary = [_stop("赤崁樓", 1)]
    assert _remove_stop(itinerary, "garbage") is None
    assert _remove_stop(itinerary, "stop-1-9") is None  # out of range
    assert len(itinerary) == 1


def test_replacement_suggestions_excludes_used_and_is_real():
    removed = _stop("赤崁樓", 1, lat=22.9972, lng=120.2028)
    itinerary = [removed]
    sugg = _replacement_suggestions(removed, itinerary, k=3)
    assert 1 <= len(sugg) <= 3
    for item in sugg:
        assert item["spot"]["name"] and item["spot"]["name"] != "赤崁樓"
        assert item["spot"]["district"] == "中西區"
        assert "reason" in item


def test_find_poi_by_spot_id_resolves_real_poi():
    # Pull a real spot id out of a suggestion, then resolve it back.
    removed = _stop("赤崁樓", 1, lat=22.9972, lng=120.2028)
    sugg = _replacement_suggestions(removed, [removed], k=1)
    spot_id = sugg[0]["spot"]["id"]
    found = _find_poi_by_spot_id(spot_id)
    assert found is not None
    agent_id, poi = found
    assert agent_id.startswith("street_")
    assert poi.name == sugg[0]["spot"]["name"]
