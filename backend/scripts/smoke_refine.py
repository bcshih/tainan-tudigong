"""Live smoke for the conversational-explore REFINEMENT path (no swarm needed).

Seeds a 2-stop itinerary, then runs one real refine turn:
  scout(content) -> community answers (dialogue) -> refinement judge -> new itinerary
Prints which 里 were summoned, their dialogue, and the before/after itinerary.

Run: python scripts/smoke_refine.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agents"))

from google.adk.sessions import InMemorySessionService  # noqa: E402

from apps.api import gateway as g  # noqa: E402
from deg.schemas import ItineraryStop, LatLng, Poi  # noqa: E402


def _stop(name, lat, lng, agent_id):
    return ItineraryStop(
        day=1, poi=Poi(name=name, category="景點", location=LatLng(lat=lat, lng=lng)),
        agent_id=agent_id, duration_mins=60, activity=f"造訪{name}", transit_to_next=None,
    )


async def main():
    ss = InMemorySessionService()
    session = g._ExploreSession()
    session.task_id = "smoke"
    session.itinerary = [
        _stop("赤崁樓", 22.9972, 120.2028, "street_chikan_node"),
        _stop("林百貨", 22.9908, 120.2038, "street_zhongzheng_node"),
    ]
    print("=== BEFORE ===")
    for s in session.itinerary:
        print(f"  - {s.poi.name} ({s.agent_id})")

    content = "我想多一點老屋咖啡廳，幫我安排一站"
    print(f"\n=== REFINE: {content} ===")

    selected = await g._run_community_scout(ss, content, top_n=3)
    names = g._agent_name_map()
    print("scouted 里:", [names.get(a, a) for a in selected])

    answers = await g._run_community_answers(ss, content, selected)
    print("\n-- dialogue --")
    for a in answers:
        print(f"  [{a.street_name}] {a.answer_text[:60]}")

    pool = g._li_poi_pool(selected)
    result = await g._run_refinement(ss, session, content, answers, pool)
    print("\n=== AFTER (recommendation) ===")
    print(" ", result.recommendation[:120])
    print("itinerary:")
    for stop in result.itinerary:
        print(f"  - day{stop.day} {stop.poi.name} ({stop.agent_id}) — {stop.activity[:30]}")

    # what the frontend would receive
    session.itinerary = list(result.itinerary)
    days = session.days_payload()
    print(f"\nitinerary_update days={len(days)} total_items="
          f"{sum(len(d['items']) for d in days)}")


if __name__ == "__main__":
    asyncio.run(main())
