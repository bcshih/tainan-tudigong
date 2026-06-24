# 台南智慧旅遊系統 — 前端架構文件

## Component Tree

```
App
├── PreferenceForm          # Phase 1：意圖收集
│   ├── DateRangePicker
│   ├── StyleChipGrid
│   ├── WishlistInput
│   └── HardConstraintInput
│
├── ChatRoom                # Phase 2：多 Agent 聊天室
│   ├── ChatHeader          (連線狀態 + 產生行程按鈕)
│   ├── MessageList
│   │   └── MessageBubble[] (user / village_chief / system)
│   │       └── SpotCardMini (附加景點預覽)
│   └── ChatInputBar
│
└── ItineraryView           # Phase 3：行程單 + 地圖
    ├── ItinerarySidebar
    │   ├── DayTabs
    │   ├── ItineraryCardList
    │   │   └── ItineraryCard[]
    │   │       └── ReplacementPanel (刪除後展開)
    │   └── ExportButton
    └── MapArea             (Mapbox GL JS 插入點)
```

---

## State Management（Zustand）

```typescript
interface AppState {
  phase: "form" | "chat" | "itinerary";
  preferences: UserPreferences | null;
  messages: ChatMessage[];
  itinerary: DayItinerary[];
  activeReplacements: { itemId: string; suggestions: ReplacementSuggestion[] } | null;
  wsStatus: "disconnected" | "connecting" | "connected";
}
```

---

## WebSocket 訊息協議

### 後端 → 前端（Server → Client）

| type | payload | 說明 |
|------|---------|------|
| `chat` | `ChatMessage` | 里長傳來的對話訊息 |
| `agent_typing` | `{ agentId: string }` | 顯示打字中動畫 |
| `agent_join` | `{ agentId, agentName, district }` | 新里長加入通知 |
| `itinerary_update` | `DayItinerary[]` | 行程更新（全量替換） |
| `replacement_suggestions` | `{ itemId, suggestions[] }` | 刪除後的替換建議 |

### 前端 → 後端（Client → Server）

| type | payload | 說明 |
|------|---------|------|
| `chat` | `{ content: string }` | 使用者傳送訊息 |
| `remove_item` | `{ itemId: string }` | 刪除行程項目，觸發替換建議 |
| `replace_item` | `{ itemId, newSpotId }` | 確認替換 |
| `finalize_itinerary` | `{}` | 確認行程完成，進入 Phase 3 |

---

## API 欄位設計

### POST /api/session/start

Request:
```json
{
  "dateRange": { "start": "2025-10-01", "end": "2025-10-03" },
  "hardConstraints": [
    { "date": "2025-10-01", "spotName": "奇美博物館", "note": "已購票" }
  ],
  "wishlist": ["赤崁樓", "神農街"],
  "travelStyles": ["文青跑咖", "古蹟景點"]
}
```

Response:
```json
{
  "sessionId": "uuid-xxxx",
  "wsUrl": "ws://api.example.com/ws/uuid-xxxx"
}
```

---

### ChatMessage 結構（WebSocket payload）

```typescript
{
  id: string;
  agentId: string;            // "village_chief_zhongxi" | "user" | "system"
  agentName: string;          // "中西區 · 神農里里長"
  agentType: "user" | "village_chief" | "system";
  villageDistrict?: string;   // "中西區 · 神農里"
  content: string;
  timestamp: string;          // ISO 8601
  attachedSpot?: Spot;        // 附加景點資訊
  tags?: string[];            // ["🚶 走路3分鐘", "🔥 好評3000+"]
  isTyping?: boolean;
}
```

---

### DayItinerary 結構

```typescript
{
  date: string;               // "2025-10-01"
  items: ItineraryItem[];
}

ItineraryItem {
  id: string;
  date: string;
  order: number;
  spot: Spot;
  transportFromPrev: "walk" | "scooter" | "taxi" | "bus";
  durationMinutes?: number;
  note?: string;
}

Spot {
  id: string;
  name: string;
  district: string;           // "中西區"
  village: string;            // "神農里"
  address: string;
  openHours: string;          // "09:00–18:00"
  description: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  walkMinutesFromPrev?: number;
  tags?: string[];
  lat?: number;
  lng?: number;
}
```

---

## 技術選型

| 需求 | 套件 | 原因 |
|------|------|------|
| UI 框架 | React 18 + TypeScript | 生態最豐富，Agent 系統套件支援度高 |
| 狀態管理 | Zustand | 輕量，適合中型應用，無 boilerplate |
| 地圖 | Mapbox GL JS | 完全客製化風格，可配合櫻花粉主題 |
| 拖拉排序 | @dnd-kit/core | 比 react-beautiful-dnd 更現代，無障礙友善 |
| 動畫 | Framer Motion | 訊息進場、卡片替換動畫 |
| 日期選擇 | react-day-picker | 輕量，樣式完全可控 |
| 建置工具 | Vite | 開發速度快 |

---

## 後續整合 Mapbox

1. 安裝：`npm install mapbox-gl`
2. 在 `MapArea` 組件加入：
```typescript
import mapboxgl from "mapbox-gl";
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
```
3. 將 `itinerary[activeDay].items` 的 `spot.lat/lng` 轉為 GeoJSON Feature
4. 建議使用 Mapbox Studio 建立自訂「輕粉色台南」地圖樣式
