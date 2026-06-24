# Frontend ↔ Backend API Contract

**Single source of truth** for the integration between the `tainan-travel` frontend
(Vite/React/Zustand, deployed on Netlify) and the `數位土地公` backend (FastAPI/ADK,
deployed on Railway). The two repos stay independent; both code against this document.

- **Logic / UI / UX / agent-discussion / human-interaction** → the frontend's model wins.
- **Database structure** → the backend's NGSI-LD + warmdata model wins.
- The frontend speaks a simple typed protocol (`{type, ...}` over WS, plain JSON over REST).
  The backend's A2UI endpoints (`/ws/*/a2ui`) are **not** used by this frontend.

CORS is `allow_origins=["*"]`. Geo coordinates are WGS84 `lat`/`lng`.

---

## Environment (frontend)

```
VITE_BACKEND_HTTP=https://<railway-app>            # e.g. https://digital-earth-god-backend-production.up.railway.app
VITE_BACKEND_WS=wss://<railway-app>                # same host, wss://
```

Local dev: `http://127.0.0.1:8080` / `ws://127.0.0.1:8080`.
Replace the hard-coded `BACKEND_WS` in `src/hooks/useWebSocket.ts` with `import.meta.env.VITE_BACKEND_WS`.

---

## Shared shapes

### `Spot` (matches frontend `src/types/index.ts`)

```jsonc
{
  "id": "赤嵌里-赤崁樓",
  "name": "赤崁樓",
  "district": "中西區",      // always 中西區 for our 20 里
  "village": "赤嵌里",        // the contributing 里 (real NLSC name)
  "address": "",
  "openHours": "建議停留 60 分鐘",   // itinerary context, may be ""
  "description": "先逛古蹟",          // activity or POI note
  "tags": ["古蹟", "必訪"],
  "lat": 22.9972,
  "lng": 120.2028
}
```

### `DayItinerary`

```jsonc
{
  "day": 1,
  "items": [
    {
      "id": "stop-1-1",
      "order": 1,
      "spot": { /* Spot */ },
      "durationMinutes": 60,
      "note": "步行5分鐘到下一站"
    }
  ]
}
```

`item.id` is `stop-{day}-{order}` (1-based) — the frontend echoes it back for
`remove_item` / `replace_item`.

---

## 1. 遊府城 Explore — `WS /ws/explore` (persistent conversation)

A **long-lived** socket. The first message plans a draft itinerary; subsequent
messages keep the conversation going and **mutate the live itinerary**. Each
`chat` turn re-routes to whichever 里 are most relevant *to that message*, so
different agents speak on different turns.

### Client → Server

```jsonc
{ "intent_text": "文青跑咖、想去神農街，10/1到10/2", "lat": 22.99, "lng": 120.20 } // first turn
{ "type": "chat", "content": "多一點咖啡廳" }
{ "type": "remove_item", "itemId": "stop-1-2" }
{ "type": "replace_item", "itemId": "stop-1-2", "newSpotId": "神農里-某咖啡" }
{ "type": "finalize_itinerary" }
```

### Server → Client

| `type` | payload | when |
|--------|---------|------|
| `phase` | `{phase, message}` | progress: `intent_extraction`/`routing`/`bidding`/`refining` |
| `task_broadcast` | `{data: TaskBroadcast}` | first turn — show 「土地公降旨」 |
| `agent_join` | `{agent, agent_name}` | a 里 joins the discussion this turn |
| `agent_typing` | `{agent}` | typing animation |
| `agent_event` | `{agent, agent_name, text, attachedSpot?}` | a 里長's **readable** line; `attachedSpot` is a `Spot` to pop as a 籤 |
| `verdict_text` | `{text}` | 土地公's remark for this turn (神諭氣泡) |
| `itinerary_update` | `{data: DayItinerary[]}` | **full** latest itinerary — replace wholesale |
| `replacement_suggestions` | `{itemId, suggestions:[{spot:Spot, reason, tags}]}` | after `remove_item` |
| `error` | `{message}` | a turn failed (socket stays open) |
| `done` | `{}` | after `finalize_itinerary` |

Notes:
- `agent_event.text` is **never** raw JSON — bids/debates are converted to prose.
- The first turn runs the full Contract Net (requires the **Swarm Server** on `:9000`).
  Refinement turns run in-process (no swarm needed).
- `itinerary_update` is the **whole** plan; the frontend's `parseItinerary` becomes a
  straight passthrough (shapes already match).

---

## 2. 廟口議 Council — `WS /ws/council`

### Client → Server
```jsonc
{ "topic": "中秋府城燈會要不要三區聯合舉辦？" }
```

### Server → Client

| `type` | payload |
|--------|---------|
| `phase` | `{phase}` — `routing` / `assembling` |
| `boundaries` | `{data: [{agent_id, street_name, centroid:{lat,lng}, polygon:[[lat,lng], …]}]}` |
| `statement` | `{data: {agent_id, street_name, round, stance, responds_to, text, sources}}` |
| `verdict` | `{data: {topic, tudigong_summary, alignments:[{agent_id, street_name, final_stance}]}}` |
| `done` / `error` | — |

`stance` ∈ `support | oppose | question | inform | silent`.
**Map note:** `polygon` is `[lat,lng]`; Mapbox GL wants `[lng,lat]` — swap per point.
Highlight the speaking 里 on each `statement`; recolour to `alignments` on `verdict`.

---

## 3. 還心願 Wish — `POST /wish`

### Request
```jsonc
{ "wish_text": "神農街路燈壞了三週，晚上很暗", "lat": 22.994, "lng": 120.195, "photo_ref": null }
```
The frontend may fold its category/urgency selection into `wish_text`; the backend's
五營兵將 does the authoritative classification.

### Response
```jsonc
{
  "wish":     { "wish_id", "raw_text", "category", "location":{lat,lng}, "created_at", "status", "summary", "sentiment", "tags":[] },
  "analysis": { "category", "tags":[], "summary", "sentiment" },
  "blessing": { "acknowledgment", "blessing" }
}
```
Show the incense animation, then `blessing.acknowledgment` + `blessing.blessing` +
`analysis.category`.

---

## 4. 府城報 Dashboard — `GET /dashboard/summary` (+ `GET /wishes?limit=N`)

```jsonc
{
  "total": 12,
  "by_category": { "公共設施": 5, "交通": 4, "其他": 3 },
  "points": [ { "lat", "lng", "category" } ],
  "recent": [
    { "wish_id", "raw_text", "category", "summary", "sentiment", "tags":[],
      "location":{lat,lng}, "created_at", "status" }
  ]
}
```
`FuPage` replaces its mock reports with `recent`; the AI 導讀 uses `summary`/`sentiment`.

---

## 5. 求吉籤 Fortune — `GET /fortune/itinerary`

```jsonc
{ "grade": "上上大吉", "poem": ["…","…","…","…"], "spots": [ /* Spot */ ] }
```
`spots` are real POIs sampled from the 20 里's NGSI-LD data.

---

## 6. 問神明 Divination — `POST /divination`

### Request
```jsonc
{ "god_id": "tudigong", "question": "今日出遊適不適合？", "poe_result": "sheng", "weather": "晴 29°C" }
```
`god_id` ∈ `tudigong | yuelao | mazu | caishen | guandi | guanyin`;
`poe_result` ∈ `sheng | yin | xiao`. The 擲筊 ritual + weather fetch stay client-side.

### Response
```jsonc
{ "title": "聖筊・出行大吉", "msg": "土地公保佑…", "sub": "一正一反，神明允許！" }
```

---

## Out of scope

- A2UI endpoints (`/ws/*/a2ui`) and the Next.js `apps/web` — kept for the legacy demo,
  not used by this frontend.
- Multi-district itineraries — the dataset is 中西區's 20 里 only.
- Explore conversation persistence — session state is in-memory per connection.
