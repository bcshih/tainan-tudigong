import { useState, useEffect, useRef } from "react";
import type { HardConstraint, TravelStyle, UserPreferences } from "../../types";
import { useAppStore } from "../../store/appStore";

const TRAVEL_STYLES: TravelStyle[] = [
  "文青跑咖","古蹟景點","風格小店","瘋狂吃美食","親子同遊","戶外踏青",
  "夜貓微醺","網美打卡","廟宇祈福","慢活騎行","手作體驗","老字號冰品"
];
const STYLE_EMOJI: Record<string, string> = {
  文青跑咖:"☕", 古蹟景點:"🏯", 風格小店:"🛍️", 瘋狂吃美食:"🍜",
  親子同遊:"👨‍👩‍👧", 戶外踏青:"🌿", 夜貓微醺:"🏮", 網美打卡:"📸",
  廟宇祈福:"🌊", 慢活騎行:"🚲", 手作體驗:"🏺", 老字號冰品:"🍧",
};

const PHOTOS = [
  {src:"/spots/spot1.jpg",name:"台南市美術館",tag:"文創藝術"},
  {src:"/spots/spot2.jpg",name:"安平樹屋",tag:"歷史古蹟"},
  {src:"/spots/spot3.jpg",name:"台南廟宇",tag:"宗教文化"},
  {src:"/spots/spot4.webp",name:"井仔腳鹽田",tag:"自然景觀"},
  {src:"/spots/spot5.jpg",name:"河樂廣場",tag:"城市地標"},
  {src:"/spots/spot6.jpg",name:"奇美博物館",tag:"博物館"},
  {src:"/spots/spot7.jpg",name:"台南古建築",tag:"古都風情"},
];

const MOCK_SPOTS = [
  {id:"1",name:"奇美博物館",address:"台南市仁德區文華路二段66號",district:"仁德區",village:"中洲里",lat:22.9876,lng:120.2345},
  {id:"2",name:"赤崁樓",address:"台南市中西區民族路二段212號",district:"中西區",village:"赤崁里",lat:22.9972,lng:120.2028},
  {id:"3",name:"安平古堡",address:"台南市安平區國勝路82號",district:"安平區",village:"古堡里",lat:22.9929,lng:120.1617},
  {id:"4",name:"神農街",address:"台南市中西區神農街",district:"中西區",village:"神農里",lat:22.9940,lng:120.1950},
  {id:"5",name:"台南孔廟",address:"台南市中西區南門路2號",district:"中西區",village:"孔廟里",lat:22.9937,lng:120.2013},
  {id:"6",name:"花園夜市",address:"台南市北區海安路三段533號",district:"北區",village:"花園里",lat:23.0138,lng:120.2029},
  {id:"7",name:"安平樹屋",address:"台南市安平區古堡街108巷",district:"安平區",village:"安平里",lat:22.9893,lng:120.1607},
  {id:"8",name:"林百貨",address:"台南市中西區忠義路二段63號",district:"中西區",village:"中正里",lat:22.9972,lng:120.2001},
  {id:"9",name:"井仔腳瓦盤鹽田",address:"台南市北門區永華里80號",district:"北門區",village:"永華里",lat:23.2654,lng:120.1123},
  {id:"10",name:"河樂廣場",address:"台南市中西區中正路",district:"中西區",village:"河樂里",lat:22.9988,lng:120.1972},
];

interface Spot{id:string;name:string;address:string;district:string;village:string;lat:number;lng:number}

const LOADING_TEXTS = [
  "伯樂們正備好茶點趕來中...",
  "安平里長騎著機車出發了...",
  "神農街里長正在整理推薦清單...",
  "土地公保佑，好行程即將誕生...",
  "里長們正在討論你的專屬路線...",
];

function TudigongOverlay() {
  const [textIdx, setTextIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const textTimer = setInterval(() => setTextIdx(i => (i + 1) % LOADING_TEXTS.length), 600);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + 2, 95)), 44);
    return () => { clearInterval(textTimer); clearInterval(progTimer); };
  }, []);

  return (
    <div className="tudigong-overlay">
      <div className="tudigong-card-clean">
        {/* Only one tudigong.png - CSS去背 + 3D浮沉 + 金光 */}
        <div className="loading-god-wrap">
          <div className="loading-god-backlight"/>
          <img
            src="/gods/tudigong.png"
            alt="土地公"
            className="loading-god-img active-tudigong"
          />
        </div>
        <h2 className="tudigong-title">土地公出動囉！</h2>
        <p className="loading-subtitle">{LOADING_TEXTS[textIdx]}</p>
        <div className="tudigong-progress-track">
          <div className="tudigong-progress-bar" style={{width:`${progress}%`}}/>
        </div>
        <div className="tudigong-dots"><span/><span/><span/></div>
      </div>
    </div>
  );
}

function BentoWall() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(v => v + 1), 5000); return () => clearInterval(t); }, []);
  const p = (i: number) => PHOTOS[(i + tick) % PHOTOS.length];
  return (
    <div className="bento-wall">
      <div className="bento-cell bento-cell--large">
        <img src={p(0).src} alt={p(0).name}/>
        <div className="bento-overlay"/>
        <div className="bento-tag"><span className="bento-tag-dot"/>{p(0).tag}</div>
      </div>
      <div className="bento-cell">
        <img src={p(1).src} alt={p(1).name}/>
        <div className="bento-overlay"/>
        <div className="bento-tag"><span className="bento-tag-dot"/>{p(1).tag}</div>
      </div>
      <div className="bento-cell">
        <img src={p(2).src} alt={p(2).name}/>
        <div className="bento-overlay"/>
        <div className="bento-tag"><span className="bento-tag-dot"/>{p(2).tag}</div>
      </div>
      <div className="bento-hero">
        <div className="hero-eyebrow">Tainan · 台南智慧旅遊</div>
        <h1 className="form-title"><em>探索</em>台南</h1>
        <p className="form-title-sub">讓里長們為你打造專屬的府城旅程</p>
      </div>
    </div>
  );
}

function WishlistSearch({ onSelect }: { onSelect: (s: Spot) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Spot[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const onChange = (v: string) => {
    setQ(v);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    const f = MOCK_SPOTS.filter(s => s.name.includes(v) || s.address.includes(v));
    setResults(f); setOpen(f.length > 0);
  };
  const pick = (s: Spot) => { onSelect(s); setQ(""); setResults([]); setOpen(false); };
  return (
    <div ref={ref} className="search-wrapper">
      <input className="input-field" placeholder="輸入景點名稱搜尋，例如：赤崁樓、奇美…" value={q}
        onChange={e => onChange(e.target.value)} onFocus={() => results.length > 0 && setOpen(true)} autoComplete="off"/>
      {open && (
        <div className="search-dropdown">
          {results.map(s => (
            <button key={s.id} type="button" className="search-option" onClick={() => pick(s)}>
              <span className="search-option-name">{s.name}</span>
              <span className="search-option-address">📍 {s.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PreferenceForm() {
  const { setPreferences, setPhase, setRealIntent } = useAppStore();
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [dateError, setDateError] = useState(false);
  const [styles, setStyles] = useState<TravelStyle[]>([]);
  const [transportMode, setTransportMode] = useState<"walk"|"scooter"|"car"|"transit">("scooter");
  const [wishlist, setWishlist] = useState<Spot[]>([]);
  const [constraints, setConstraints] = useState<HardConstraint[]>([{ date: "", spotName: "" }]);
  const [showTudigong, setShowTudigong] = useState(false);

  const handleDateEnd = (val: string) => {
    setDateEnd(val);
    if (dateStart && val && val < dateStart) {
      setDateError(true);
    } else {
      setDateError(false);
    }
  };

  const toggleStyle = (s: TravelStyle) => setStyles(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const addSpot = (s: Spot) => { if (!wishlist.find(w => w.id === s.id)) setWishlist(p => [...p, s]); };
  const removeSpot = (id: string) => setWishlist(p => p.filter(w => w.id !== id));
  const updateConstraint = (i: number, field: keyof HardConstraint, val: string) => {
    const n = [...constraints]; n[i] = { ...n[i], [field]: val }; setConstraints(n);
  };

  const handleSubmit = async () => {
    setShowTudigong(true);
    setPreferences({ dateRange: { start: dateStart, end: dateEnd }, hardConstraints: constraints.filter(c => c.date && c.spotName), wishlist: wishlist.map(w => w.name), travelStyles: styles });

    // 組合意圖文字
    const intentText = [
      styles.join("、"),
      wishlist.length > 0 ? `想去${wishlist.map(w=>w.name).join("、")}` : "",
      dateStart ? `${dateStart}到${dateEnd}` : "",
    ].filter(Boolean).join("，") || "我想探索台南";

    // 取得位置（非阻擋）
    let lat = 22.9999, lng = 120.2269;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* 定位失敗用預設台南市中心 */ }

    // 存入 store，ChatRoom 會用來建立真實 WebSocket 連線
    setRealIntent({ text: intentText, lat, lng });

    setTimeout(() => {
      setShowTudigong(false);
      setPhase("chat");
    }, 2800);
  };

  const isValid = dateStart && dateEnd && !dateError && styles.length > 0;

  return (
    <div className="form-page">
      {showTudigong && <TudigongOverlay/>}
      <BentoWall/>
      <div className="form-panel">
        <div className="panel-heading">
          <h2 className="panel-title">規劃你的旅程</h2>
          <p className="panel-subtitle">告訴府城伯樂們你的期待</p>
        </div>

        <section className="form-section">
          <label className="section-label">旅遊日期</label>
          <div className="date-row">
            <input type="date" className="input-field" value={dateStart}
              onChange={e => { setDateStart(e.target.value); if (dateEnd && dateEnd < e.target.value) setDateError(true); else setDateError(false); }}/>
            <span className="date-sep">→</span>
            <input type="date" className={`input-field ${dateError ? "input-error" : ""}`}
              min={dateStart || undefined}
              value={dateEnd} onChange={e => handleDateEnd(e.target.value)}/>
          </div>
          {dateError && (
            <p className="date-error-msg">⏳ 時空旅人請留步，結束日期不能早於開始日期喔！</p>
          )}
        </section>

        <section className="form-section">
          <label className="section-label">旅遊風格</label>
          <p className="section-hint">可複選，里長們會據此推薦在地好去處</p>
          <div className="style-grid">
            {TRAVEL_STYLES.map(s => (
              <button key={s} type="button" className={`style-chip ${styles.includes(s) ? "active" : ""}`} onClick={() => toggleStyle(s)}>
                <span className="chip-emoji">{STYLE_EMOJI[s]}</span>{s}
              </button>
            ))}
          </div>
        </section>

        <section className="form-section">
          <label className="section-label">我的足跡印記</label>
          <p className="section-hint">搜尋必去景點，系統自動連結負責里長</p>
          <div className="timeline-list">
            {wishlist.map((spot, i) => (
              <div key={spot.id} className="timeline-item">
                <div className="tl-col">
                  <div className="tl-dot"/>
                  {i < wishlist.length - 1 && <div className="tl-line"/>}
                </div>
                <div className="tl-card">
                  <div>
                    <div className="tl-name">📍 {spot.name}</div>
                    <div className="tl-addr">{spot.district} · {spot.village}</div>
                  </div>
                  <button type="button" className="remove-tag-btn" onClick={() => removeSpot(spot.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <WishlistSearch onSelect={addSpot}/>
        </section>

        <section className="form-section">
          <label className="section-label">已確定行程</label>
          <p className="section-hint">已訂票或預約，里長們絕對不會動到</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {constraints.map((c, i) => (
              <div key={i} className="constraint-row">
                <input type="date" className="input-field constraint-date" value={c.date} onChange={e => updateConstraint(i, "date", e.target.value)}/>
                <input className="input-field" placeholder="景點名稱" value={c.spotName} onChange={e => updateConstraint(i, "spotName", e.target.value)}/>
                {i === constraints.length - 1 && (
                  <button type="button" className="add-btn" onClick={() => setConstraints([...constraints, { date: "", spotName: "" }])}>＋</button>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="form-section">
          <label className="section-label">交通方式</label>
          <div className="transport-grid">
            {([
              {id:"walk",   icon:"🚶", label:"步行為主"},
              {id:"scooter",icon:"🛵", label:"機車"},
              {id:"car",    icon:"🚗", label:"自駕"},
              {id:"transit",icon:"🚌", label:"大眾運輸"},
            ] as const).map(t => (
              <button key={t.id} type="button"
                className={`transport-btn ${transportMode===t.id?"active":""}`}
                onClick={()=>setTransportMode(t.id)}>
                <span className="transport-icon">{t.icon}</span>
                <span className="transport-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={`submit-btn ${isValid ? "ready" : ""}`} disabled={!isValid} onClick={handleSubmit}>
          開啟府城伯樂茶會 ✦
        </button>
      </div>
    </div>
  );
}
