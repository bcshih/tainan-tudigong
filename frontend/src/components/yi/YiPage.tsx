import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOPICS = ["中秋府城燈會聯合舉辦","台南夜間觀光路線規劃","古蹟周邊交通改善","在地小農市集推廣"];

const WS_URL = (import.meta.env.VITE_BACKEND_WS ?? "ws://127.0.0.1:8080") + "/ws/council";

const STANCE_COLOR: Record<string, string> = {
  support:  "#22c55e",
  oppose:   "#ef4444",
  question: "#f59e0b",
  inform:   "#3b82f6",
  silent:   "#9ca3af",
};

interface CouncilMsg {
  id: string;
  agentId: string;
  name: string;
  color: string;
  badge: string;
  village: string;
  content: string;
  time: string;
  isSystem?: boolean;
}

export function YiPage() {
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [messages, setMessages] = useState<CouncilMsg[]>([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [boundaries, setBoundaries] = useState<any[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mbRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 初始化 Mapbox 地圖（議題開始後）
  useEffect(() => {
    if (!started || !mapRef.current || mbRef.current) return;
    mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4eHh4eHh4eHh4eHh4eHh4eHh4eHh4In0.dummy") as string;
    const map = new mapboxgl.Map({
      container: mapRef.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [120.2012, 22.9998],
      zoom: 13,
      attributionControl: false,
    });
    mbRef.current = map;
    return () => { map.remove(); mbRef.current = null; };
  }, [started]);

  // 有邊界資料時畫到地圖上
  useEffect(() => {
    const map = mbRef.current;
    if (!map || boundaries.length === 0) return;
    const draw = () => drawBoundaries(map, boundaries, activeSpeaker);
    if (!map.loaded()) { map.on("load", draw); }
    else draw();
  }, [boundaries, activeSpeaker]);

  function drawBoundaries(map: mapboxgl.Map, bounds: any[], speaker: string | null) {
    // 清除舊圖層
    bounds.forEach(b => {
      if (map.getLayer(`fill-${b.agent_id}`)) map.removeLayer(`fill-${b.agent_id}`);
      if (map.getLayer(`line-${b.agent_id}`)) map.removeLayer(`line-${b.agent_id}`);
      if (map.getSource(`src-${b.agent_id}`)) map.removeSource(`src-${b.agent_id}`);
    });
    bounds.forEach(b => {
      // ⚠️ 後端送 [lat, lng]，Mapbox 要 [lng, lat]
      const coords = b.polygon.map(([lat, lng]: [number, number]) => [lng, lat]);
      const stance = b.final_stance ?? "silent";
      const color = STANCE_COLOR[stance] ?? "#9ca3af";
      const isActive = b.agent_id === speaker;
      map.addSource(`src-${b.agent_id}`, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} },
      });
      map.addLayer({ id: `fill-${b.agent_id}`, type: "fill", source: `src-${b.agent_id}`,
        paint: { "fill-color": color, "fill-opacity": isActive ? 0.55 : 0.25 } });
      map.addLayer({ id: `line-${b.agent_id}`, type: "line", source: `src-${b.agent_id}`,
        paint: { "line-color": color, "line-width": isActive ? 3 : 1 } });
    });
  }

  const startDiscussion = (t: string) => {
    setTopic(t); setStarted(true); setMessages([]); setBoundaries([]); setActiveSpeaker(null);
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ topic: t }));
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }
      const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });

      if (msg.type === "boundaries") {
        setBoundaries(msg.data);
      } else if (msg.type === "statement") {
        const d = msg.data;
        setActiveSpeaker(d.agent_id);
        // 更新邊界顏色（加上 stance）
        setBoundaries(prev => prev.map(b =>
          b.agent_id === d.agent_id ? { ...b, final_stance: d.stance } : b
        ));
        setMessages(m => [...m, {
          id: `stmt-${Date.now()}`,
          agentId: d.agent_id,
          name: d.street_name,
          color: STANCE_COLOR[d.stance] ?? "#9ca3af",
          badge: d.stance === "support" ? "✅" : d.stance === "oppose" ? "❌" : "💬",
          village: d.street_name,
          content: d.text,
          time: now,
        }]);
      } else if (msg.type === "verdict") {
        const d = msg.data;
        setActiveSpeaker(null);
        // 最終立場上色
        setBoundaries(prev => prev.map(b => {
          const align = d.alignments?.find((a: any) => a.agent_id === b.agent_id);
          return align ? { ...b, final_stance: align.final_stance } : b;
        }));
        setMessages(m => [...m, {
          id: `verdict-${Date.now()}`,
          agentId: "system",
          name: "土地公",
          color: "#FFD700",
          badge: "🏮",
          village: "府城",
          content: `✦ 土地公降旨 ✦ ${d.tudigong_summary}`,
          time: now,
          isSystem: true,
        }]);
      }
    };

    ws.onclose = () => { wsRef.current = null; setWsConnected(false); };
    ws.onerror = () => {
      setWsConnected(false);
      const now = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
      setMessages(m => [...m, {
        id: `err-${Date.now()}`,
        agentId: "system",
        name: "系統",
        color: "#9ca3af",
        badge: "⚠️",
        village: "",
        content: "⚠️ 無法連線到後端，請確認後端服務已啟動",
        time: now,
        isSystem: true,
      }]);
    };
  };

  if (!started) return (
    <div className="yi-page">
      <div className="yi-header">
        <h1 className="yi-title">🏯 廟口議</h1>
        <p className="yi-subtitle">里長大會 · 城市大事共同討論</p>
      </div>
      <div className="yi-topic-select">
        <p className="yi-topic-label">選擇議題，召集里長們開始討論：</p>
        <div className="yi-topic-grid">
          {TOPICS.map(t => (
            <button key={t} type="button" className="yi-topic-btn" onClick={() => startDiscussion(t)}>{t}</button>
          ))}
        </div>
        <div className="yi-custom-row">
          <input className="chat-input" placeholder="或輸入自訂議題…" value={customTopic} onChange={e=>setCustomTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&customTopic.trim()&&startDiscussion(customTopic.trim())}/>
          <button type="button" className="send-btn" onClick={()=>customTopic.trim()&&startDiscussion(customTopic.trim())} disabled={!customTopic.trim()}>提出</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="yi-page">
      <div className="yi-header">
        <h1 className="yi-title">🏯 廟口議</h1>
        <p className="yi-subtitle">里長大會 · 城市大事共同討論</p>
        <div className="yi-topic">📌 議題：{topic}</div>
        {wsConnected && <div style={{fontSize:"0.7rem",color:"#22c55e",marginTop:4}}>● 已連線後端</div>}
      </div>
      <div className="yi-chat">
        {/* Mapbox 地圖（議題開始後顯示） */}
        {started && <div ref={mapRef} style={{ height: 220, borderRadius: 12, overflow: "hidden", marginBottom: 8 }} />}
        <div className="yi-messages">
          {messages.map(m => (
            <div key={m.id} className={`yi-msg ${m.agentId==="user"?"yi-msg--user":""} ${m.agentId==="system"?"yi-msg--system":""}`}>
              {m.agentId!=="user" && <div className="yi-avatar" style={{background:m.color}}>{m.badge}</div>}
              <div className="yi-bubble-wrap">
                {m.agentId!=="user" && <span className="yi-name" style={{color:m.color}}>{m.name}{m.village&&` · ${m.village}`}</span>}
                <div className={`yi-bubble ${m.agentId==="system"?"yi-bubble--divine yi-bubble--decree":""} ${m.agentId==="user"?"yi-bubble--user":""}`}
                  style={m.agentId==="system"?{background:"linear-gradient(90deg,#8b0000,#c49a23)",borderColor:"var(--gold)",boxShadow:"0 0 25px #ffd700,inset 0 0 15px rgba(255,215,0,0.4)",animation:"godDecreeFlash 0.5s ease-out"}:{}}>
                  {m.content}
                </div>
                <span className="yi-time">{m.time}</span>
              </div>
            </div>
          ))}
          {messages.length === 0 && started && (
            <div className="yi-msg yi-msg--system">
              <div className="yi-avatar" style={{background:"#37516c"}}>🏯</div>
              <div className="yi-bubble-wrap">
                <div className="yi-bubble"><div className="typing-indicator"><span/><span/><span/></div></div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div className="yi-input-bar">
          <input className="chat-input" placeholder="議事結束後可換題重開…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&input.trim()&&startDiscussion(input.trim())} disabled={wsConnected}/>
          <button type="button" className="send-btn" onClick={()=>input.trim()&&startDiscussion(input.trim())} disabled={!input.trim()||wsConnected}>換題</button>
        </div>
      </div>
    </div>
  );
}
