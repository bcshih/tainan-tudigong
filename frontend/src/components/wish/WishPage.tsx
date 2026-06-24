import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4eHh4eHh4eHh4eHh4eHh4eHh4eHh4In0.dummy") as string;

type Category = "🚧 道路破損"|"💡 燈具故障"|"🚯 髒亂污染"|"🌳 公園維護"|"🚰 水管問題"|"🐕 流浪動物";
type Urgency = "low"|"mid"|"high";

const CATEGORIES: Category[] = ["🚧 道路破損","💡 燈具故障","🚯 髒亂污染","🌳 公園維護","🚰 水管問題","🐕 流浪動物"];
const URGENCY_LABELS: Record<Urgency,string> = {low:"⏳ 稍後處理",mid:"⚠️ 需要關注",high:"🚨 刻不容緩"};
const URGENCY_COLORS: Record<Urgency,string> = {low:"#f5ae85",mid:"#cf447a",high:"#ff4444"};

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
            <g key={x} style={{transform:phase==="insert"?`translateY(${-70+i*8}px)`:"translateY(0)",transition:`transform 0.7s ease ${i*0.18}s`}}>
              <rect x={x-1.5} y="14" width="3" height="70" rx="1.5" fill="#c8a46e"/>
              <ellipse cx={x} cy="14" rx="4" ry="4" fill="#FFD700" opacity={phase!=="insert"?0.9:0} style={{transition:"opacity 0.5s ease 0.9s"}}/>
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

function WishMap({ onPin }: { onPin: (lat:number,lng:number)=>void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map|null>(null);
  const markerRef = useRef<mapboxgl.Marker|null>(null);
  const [pinned, setPinned] = useState(false);
  const [address, setAddress] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({ container:containerRef.current, style:"mapbox://styles/mapbox/dark-v11", center:[120.2012,22.9998], zoom:12, attributionControl:false });
    mapRef.current = map;
    map.on("click", e => { placePin(e.lngLat.lat, e.lngLat.lng); });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const placePin = (lat:number, lng:number) => {
    if (!mapRef.current) return;
    markerRef.current?.remove();
    const el = document.createElement("div");
    el.className = "prayer-map-pin";
    el.innerHTML = `<div class="prayer-pin-pulse"></div><div class="prayer-pin-dot"></div>`;
    markerRef.current = new mapboxgl.Marker({element:el}).setLngLat([lng,lat]).addTo(mapRef.current);
    mapRef.current.flyTo({center:[lng,lat],zoom:15,duration:800});
    setPinned(true);
    onPin(lat, lng);
  };

  const handleGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { placePin(pos.coords.latitude, pos.coords.longitude); setGpsLoading(false); },
      () => { alert("無法取得位置，請確認瀏覽器定位權限"); setGpsLoading(false); }
    );
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address+" 台南")}.json?access_token=${mapboxgl.accessToken}&limit=1&language=zh`);
      const data = await res.json();
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        placePin(lat, lng);
      } else alert("找不到此地址");
    } catch { alert("搜尋失敗，請稍後再試"); }
  };

  return (
    <div className="prayer-map-section">
      <div className="prayer-map-controls">
        <div className="prayer-address-row">
          <input className="input-field prayer-address-input" placeholder="輸入地址搜尋…" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
          <button type="button" className="prayer-addr-btn" onClick={handleSearch}>搜尋</button>
        </div>
        <button type="button" className="prayer-gps-btn" onClick={handleGPS} disabled={gpsLoading}>
          {gpsLoading?"定位中…":"📍 使用目前位置"}
        </button>
      </div>
      <div ref={containerRef} className="prayer-mapbox" style={{height:220}}/>
      <p className="mini-map-label" style={{marginTop:6,fontSize:"0.72rem",color:"var(--text-secondary)"}}>
        {pinned?"✓ 位置已標記":"點擊地圖標記問題位置，或使用上方搜尋/定位"}
      </p>
    </div>
  );
}

export function WishPage() {
  const [category, setCategory] = useState<Category|null>(null);
  const [urgency, setUrgency] = useState<Urgency>("mid");
  const [content, setContent] = useState("");
  const [pin, setPin] = useState<{lat:number;lng:number}|null>(null);
  const [showAnim, setShowAnim] = useState(false);
  const [success, setSuccess] = useState(false);
  const [blessing, setBlessing] = useState<{ acknowledgment: string; blessing: string } | null>(null);

  const BASE = import.meta.env.VITE_BACKEND_HTTP ?? "http://127.0.0.1:8080";
  const canSubmit = !!(category && content.trim().length > 0 && pin);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setShowAnim(true);
    try {
      const wishText = `【${category}】${URGENCY_LABELS[urgency]}：${content}`;
      const res = await fetch(`${BASE}/wish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wish_text: wishText, lat: pin!.lat, lng: pin!.lng, photo_ref: null }),
      });
      const data = await res.json();
      setBlessing(data.blessing ?? null);
    } catch {
      // 打 API 失敗也讓動畫跑完，不影響體驗
    }
  };
  const handleAnimDone = () => {
    setShowAnim(false); setSuccess(true);
    setContent(""); setCategory(null); setPin(null);
    setTimeout(() => { setSuccess(false); setBlessing(null); }, 5000);
  };

  return (
    <div className="wish-page">
      {showAnim && <IncenseAnimation onDone={handleAnimDone}/>}
      <div className="wish-header">
        <h1 className="wish-title">🏮 還心願</h1>
        <p className="wish-subtitle">向土地公反映城市問題，里長自動傳達至市政府</p>
      </div>
      <div className="wish-form-scroll">
        <div className="wish-form-inner">
          {success && (
            <div className="prayer-success">
              {blessing ? (
                <>
                  <div>{blessing.acknowledgment}</div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>{blessing.blessing}</div>
                </>
              ) : "✦ 願望已送達！土地公正在傳達給里長們 ✦"}
            </div>
          )}
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
            <WishMap onPin={(lat,lng)=>setPin({lat,lng})}/>
          </section>
          <section className="prayer-section">
            <label className="prayer-label">詳細描述</label>
            <textarea className="prayer-textarea" rows={3} value={content} onChange={e=>setContent(e.target.value)} placeholder="請描述城市問題…"/>
            <p className="prayer-char-count">{content.length} 字</p>
          </section>
          <button type="button" className={`prayer-submit-btn ${canSubmit?"ready":""}`} disabled={!canSubmit} onClick={handleSubmit}>
            🕯️ 點擊點香 · 誠心齊願
          </button>
        </div>
      </div>
    </div>
  );
}
