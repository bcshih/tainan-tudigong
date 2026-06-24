import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4eHh4eHh4eHh4eHh4eHh4eHh4eHh4In0.dummy") as string;

type Category = "🚧 道路破損"|"💡 燈具故障"|"🚯 髒亂污染"|"🌳 公園維護"|"🚰 水管問題"|"🐕 流浪動物";
type Urgency = "low"|"mid"|"high";
type ViewMode = "citizen"|"gov";

const CATEGORIES: Category[] = ["🚧 道路破損","💡 燈具故障","🚯 髒亂污染","🌳 公園維護","🚰 水管問題","🐕 流浪動物"];
const URGENCY_LABELS: Record<Urgency,string> = { low:"⏳ 稍後處理", mid:"⚠️ 需要關注", high:"🚨 刻不容緩" };
const URGENCY_COLORS: Record<Urgency,string> = { low:"#f5ae85", mid:"#cf447a", high:"#ff4444" };

interface Report { id:string; category:Category; urgency:Urgency; content:string; lat:number; lng:number; time:string; aiSummary:string; }
const MOCK_REPORTS: Report[] = [
  { id:"r1", category:"🚧 道路破損", urgency:"high", content:"赤崁樓附近的民族路有一個大坑洞，下雨天很危險！", lat:22.9972, lng:120.2028, time:"2小時前", aiSummary:"中西區民族路段嚴重路面損壞，已有事故紀錄，建議優先派工修繕" },
  { id:"r2", category:"💡 燈具故障", urgency:"mid", content:"神農街靠近末端的路燈三個禮拜前就壞了，晚上很暗。", lat:22.9940, lng:120.1950, time:"1天前", aiSummary:"神農街路燈故障逾三週，夜間安全疑慮，建議本週排修" },
  { id:"r3", category:"🚯 髒亂污染", urgency:"low", content:"安平古堡停車場旁邊常常有人亂丟垃圾。", lat:22.9929, lng:120.1617, time:"3天前", aiSummary:"安平古堡周邊環境髒亂問題，建議增設清潔設施" },
  { id:"r4", category:"🌳 公園維護", urgency:"mid", content:"奇美博物館旁的公園有幾棵樹看起來快倒了。", lat:22.9876, lng:120.2345, time:"5天前", aiSummary:"仁德區公園樹木傾倒風險，颱風季前需評估處置" },
];

// Real Mapbox mini map for prayer
function PrayerMap({ onPin }: { onPin: (lat:number,lng:number,addr:string)=>void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map|null>(null);
  const markerRef = useRef<mapboxgl.Marker|null>(null);
  const [pinned, setPinned] = useState(false);
  const [address, setAddress] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [120.2012, 22.9998],
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placePin(lat, lng);
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const placePin = (lat: number, lng: number, addr = "") => {
    if (!mapRef.current) return;
    markerRef.current?.remove();
    const el = document.createElement("div");
    el.className = "prayer-map-pin";
    el.innerHTML = `<div class="prayer-pin-pulse"></div><div class="prayer-pin-dot"></div>`;
    markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    setPinned(true);
    onPin(lat, lng, addr);
  };

  const handleGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { placePin(pos.coords.latitude, pos.coords.longitude, "目前位置"); setGpsLoading(false); },
      () => { alert("無法取得位置，請確認瀏覽器定位權限"); setGpsLoading(false); }
    );
  };

  const handleAddressSearch = async () => {
    if (!address.trim()) return;
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address + " 台南")}.json?access_token=${mapboxgl.accessToken}&limit=1&language=zh`);
      const data = await res.json();
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        placePin(lat, lng, address);
      } else {
        alert("找不到此地址，請嘗試更精確的描述");
      }
    } catch { alert("搜尋失敗，請稍後再試"); }
  };

  return (
    <div className="prayer-map-section">
      <div className="prayer-map-controls">
        <div className="prayer-address-row">
          <input className="input-field prayer-address-input" placeholder="輸入地址搜尋…（例如：赤崁樓）" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddressSearch()}/>
          <button type="button" className="prayer-addr-btn" onClick={handleAddressSearch}>搜尋</button>
        </div>
        <button type="button" className="prayer-gps-btn" onClick={handleGPS} disabled={gpsLoading}>
          {gpsLoading ? "定位中…" : "📍 使用目前位置"}
        </button>
      </div>
      <div ref={containerRef} className="prayer-mapbox" style={{ height:260 }}/>
      <p className="mini-map-label" style={{marginTop:6}}>
        {pinned ? "✓ 位置已標記，可繼續點擊調整" : "點擊地圖標記問題位置，或使用上方搜尋/定位"}
      </p>
    </div>
  );
}

function IncenseAnimation({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"insert"|"smoke"|"done">("insert");
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("smoke"), 900);
    const t2 = setTimeout(() => setPhase("done"), 1900);
    const t3 = setTimeout(onDone, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);
  return (
    <div className="incense-overlay">
      <div className="incense-scene">
        <svg className="incense-burner-svg" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="100" cy="118" rx="65" ry="10" fill="rgba(255,215,0,0.15)"/>
          <path d="M45 88 Q50 112 100 115 Q150 112 155 88 Z" fill="#8b244a"/>
          <ellipse cx="100" cy="88" rx="55" ry="10" fill="#6d1a38"/>
          <ellipse cx="100" cy="86" rx="55" ry="8" fill="#8b244a"/>
          <ellipse cx="100" cy="84" rx="48" ry="6" fill="#c9a96e" opacity="0.6"/>
          <rect x="30" y="80" width="15" height="8" rx="4" fill="#6d1a38"/>
          <rect x="155" y="80" width="15" height="8" rx="4" fill="#6d1a38"/>
          {[75,100,125].map((x,i) => (
            <g key={x} style={{ transform: phase==="insert"?`translateY(${-70+i*8}px)`:"translateY(0)", transition:`transform 0.7s ease ${i*0.18}s` }}>
              <rect x={x-1.5} y="14" width="3" height="70" rx="1.5" fill="#c8a46e"/>
              <ellipse cx={x} cy="14" rx="4" ry="4" fill="#FFD700" opacity={phase!=="insert"?0.9:0} style={{transition:"opacity 0.5s ease 0.9s",filter:"blur(1px)"}}/>
              <ellipse cx={x} cy="14" rx="2" ry="2" fill="white" opacity={phase!=="insert"?0.8:0} style={{transition:"opacity 0.5s ease 0.9s"}}/>
            </g>
          ))}
        </svg>
        {phase !== "insert" && (
          <div className="smoke-wrap">
            {[0,1,2].map(i => <div key={i} className="smoke-wisp" style={{animationDelay:`${i*0.22}s`}}/>)}
          </div>
        )}
        {phase === "done" && (
          <div className="incense-done">
            <div className="incense-done-gold">✦ 土地公已收到 ✦</div>
            <p className="incense-done-sub">旨令傳達至台南市政府與各里里長！</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GovDashboard() {
  const [selected, setSelected] = useState<string|null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mbRef = useRef<mapboxgl.Map|null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mbRef.current) return;
    const map = new mapboxgl.Map({ container:mapRef.current, style:"mapbox://styles/mapbox/dark-v11", center:[120.2012,22.9998], zoom:11, attributionControl:false });
    mbRef.current = map;
    map.on("load", () => {
      MOCK_REPORTS.forEach((r,i) => {
        const col = URGENCY_COLORS[r.urgency];
        const el = document.createElement("div");
        el.className = "gov-map-pin";
        el.style.background = col;
        el.style.boxShadow = `0 0 12px ${col}`;
        el.innerHTML = `<span>${i+1}</span>`;
        el.onclick = () => setSelected(s => s===r.id?null:r.id);
        const m = new mapboxgl.Marker({element:el}).setLngLat([r.lng,r.lat]).addTo(map);
        markersRef.current.push(m);
      });
    });
    return () => { map.remove(); mbRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mbRef.current || !selected) return;
    const r = MOCK_REPORTS.find(x=>x.id===selected);
    if (r) mbRef.current.flyTo({ center:[r.lng,r.lat], zoom:15, duration:800 });
  }, [selected]);

  return (
    <div className="gov-dashboard">
      <div className="gov-left">
        <div className="gov-ai-card">
          <div className="gov-ai-badge">🤖 里長 AI 智慧導讀</div>
          <p className="gov-ai-text">本週共收到 <strong style={{color:"var(--gold)"}}>4 件</strong> 陳情，其中 <strong style={{color:"#ff4444"}}>1 件緊急</strong>、2 件待處理。中西區道路損壞最急迫，建議優先排工。</p>
        </div>
        <div className="report-list">
          {MOCK_REPORTS.map(r => (
            <div key={r.id} className={`report-card ${selected===r.id?"selected":""}`} onClick={()=>setSelected(s=>s===r.id?null:r.id)}>
              <div className="report-card-top">
                <span className="report-cat">{r.category}</span>
                <span className="report-urgency" style={{color:URGENCY_COLORS[r.urgency],background:`${URGENCY_COLORS[r.urgency]}18`,border:`1px solid ${URGENCY_COLORS[r.urgency]}40`}}>{URGENCY_LABELS[r.urgency]}</span>
                <span className="report-time">{r.time}</span>
              </div>
              <p className="report-ai-summary">{r.aiSummary}</p>
              {selected===r.id && <p className="report-content">「{r.content}」</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="gov-map" ref={mapRef} style={{minHeight:400}}/>
    </div>
  );
}

export function PrayerPage() {
  const [view, setView] = useState<ViewMode>("citizen");
  const [category, setCategory] = useState<Category|null>(null);
  const [urgency, setUrgency] = useState<Urgency>("mid");
  const [content, setContent] = useState("");
  const [pin, setPin] = useState<{lat:number;lng:number}|null>(null);
  const [showAnim, setShowAnim] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fixed: only require content > 0 chars and pin
  const canSubmit = !!(category && content.trim().length > 0 && pin);

  const handleSubmit = () => { if (canSubmit) setShowAnim(true); };
  const handleAnimDone = () => {
    setShowAnim(false); setSuccess(true);
    setContent(""); setCategory(null); setPin(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="prayer-page">
      {showAnim && <IncenseAnimation onDone={handleAnimDone}/>}
      <div className="prayer-header">
        <div>
          <h1 className="prayer-title">🏮 萬民祈願 · 上香窗口</h1>
          <p className="prayer-subtitle">向土地公反映城市問題，里長 Agents 自動傳達至市政府</p>
        </div>
        <div className="view-toggle">
          <button type="button" className={`view-btn ${view==="citizen"?"active":""}`} onClick={()=>setView("citizen")}>👤 市民</button>
          <button type="button" className={`view-btn ${view==="gov"?"active":""}`} onClick={()=>setView("gov")}>🏛️ 市政府</button>
        </div>
      </div>

      {view === "gov" ? <GovDashboard/> : (
        <div className="prayer-form-area">
          {success && <div className="prayer-success">✦ 願望已送達！土地公正在傳達給里長們 ✦</div>}
          <section className="prayer-section">
            <label className="prayer-label">問題類別</label>
            <div className="prayer-cats">
              {CATEGORIES.map(c => (
                <button key={c} type="button" className={`prayer-cat-btn ${category===c?"active":""}`} onClick={()=>setCategory(c)}>{c}</button>
              ))}
            </div>
          </section>
          <section className="prayer-section">
            <label className="prayer-label">緊急程度</label>
            <div className="urgency-btns">
              {(["low","mid","high"] as Urgency[]).map(u => (
                <button key={u} type="button" className={`urgency-btn ${urgency===u?"active":""}`}
                  style={urgency===u?{borderColor:URGENCY_COLORS[u],background:`${URGENCY_COLORS[u]}15`,color:URGENCY_COLORS[u]}:{}}
                  onClick={()=>setUrgency(u)}>{URGENCY_LABELS[u]}</button>
              ))}
            </div>
          </section>
          <section className="prayer-section">
            <label className="prayer-label">問題位置</label>
            <PrayerMap onPin={(lat,lng)=>setPin({lat,lng})}/>
          </section>
          <section className="prayer-section">
            <label className="prayer-label">詳細描述</label>
            <textarea className="prayer-textarea" rows={4} value={content} onChange={e=>setContent(e.target.value)} placeholder="請描述你希望土地公幫你傳達的城市問題…"/>
            <p className="prayer-char-count">{content.length} 字</p>
          </section>
          <button type="button" className={`prayer-submit-btn ${canSubmit?"ready":""}`} disabled={!canSubmit} onClick={handleSubmit}>
            🕯️ 點擊點香 · 誠心齊願
          </button>
          {!canSubmit && (
            <p style={{fontSize:"0.75rem",color:"var(--text-dim)",textAlign:"center",marginTop:-12}}>
              請選擇類別、標記位置並填寫描述
            </p>
          )}
        </div>
      )}
    </div>
  );
}
