# 台南土地公 Tainan TuDiGong

台南中西區 AI 旅遊助理 — 20 個里 Agent 協同決策，Gemini 驅動。

**6 個功能頁面：**
| 頁面 | 功能 |
|------|------|
| 🗺️ 遊府城 | 里長 AI 持續對話，即時更新行程 |
| 🏯 廟口議 | 多里辯論 + 地圖反應式邊界 |
| 🏮 還心願 | 陳情 AI 分類 + 土地公祝福 |
| 🏛️ 府城報 | 陳情熱力圖 + AI 導讀 |
| 🎋 求吉籤 | 真實中西區景點籤詩 |
| ⛩️ 問神明 | 六位神明 Gemini persona 籤解 |

---

## 快速開始

### 1. 取得 API Key

| Key | 申請網址 |
|-----|---------|
| Google AI Studio | https://aistudio.google.com/apikey |
| Mapbox | https://account.mapbox.com/ |
| OpenWeatherMap | https://openweathermap.org/api |

### 2. 設定環境變數

```bash
cp .env.example .env
# 用文字編輯器開啟 .env，填入三個 API Key
```

### 3. 安裝後端

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -e ".[dev]"   # Windows
# source .venv/bin/activate && pip install -e ".[dev]"  # macOS/Linux
```

### 4. 安裝前端

```bash
cd frontend
npm install
```

### 5. 啟動

**Windows（雙擊）：**
```
start.bat
```

**手動逐一啟動（macOS/Linux 或除錯用）：**
```bash
# 終端機 1 — Swarm Server
cd backend/agents
GOOGLE_API_KEY=xxx python -m dijizhu.swarm_server

# 終端機 2 — Gateway
cd backend
GOOGLE_API_KEY=xxx uvicorn apps.api.gateway:app --port 8080 --reload

# 終端機 3 — Frontend
cd frontend
VITE_MAPBOX_TOKEN=xxx VITE_WEATHER_KEY=xxx npm run dev
```

瀏覽器開啟 **http://localhost:5173**

---

## 專案結構

```
tainan-tudigong/
├── backend/              FastAPI + Google ADK
│   ├── agents/           20 個中西區里 Agent + Swarm Server
│   ├── apps/api/         Gateway (WebSocket + REST)
│   ├── deg/              NGSI-LD 資料模型 / warmdata SQLite
│   └── docs/integration/ 前後端 API 合約文件
├── frontend/             Vite + React 18 + Zustand + Mapbox
│   └── src/
│       ├── components/   6 個頁面元件
│       ├── hooks/        useWebSocket（WS 串接）
│       └── store/        Zustand global state
├── .env.example          API Key 範本（複製為 .env 填入真實值）
├── start.ps1             Windows 一鍵啟動腳本
└── start.bat             Windows 雙擊捷徑
```

---

## API 端點

| 端點 | 說明 |
|------|------|
| `WS /ws/explore` | 遊府城：持續對話行程規劃 |
| `WS /ws/council` | 廟口議：多里辯論 |
| `POST /wish` | 還心願：陳情送出 |
| `GET /dashboard/summary` | 府城報：陳情統計 |
| `GET /fortune/itinerary` | 求吉籤：真實景點籤詩 |
| `POST /divination` | 問神明：神明籤解 |
| `GET /docs` | FastAPI Swagger UI |

---

## 注意事項

- `.env` 含真實 API Key，**永遠不要 commit 進 git**
- `backend/data/warmdata.db` 是本地 SQLite，不進 git
- 遊府城第一輪需要 Swarm Server（port 9000）；後續對話輪次不需要
- Mapbox 地圖需要有效 token，否則廟口議地圖不會顯示
