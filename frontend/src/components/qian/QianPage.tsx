import { useState } from "react";

const BASE = import.meta.env.VITE_BACKEND_HTTP ?? "http://127.0.0.1:8080";

const PHOTOS = ["/spots/spot1.jpg","/spots/spot2.jpg","/spots/spot3.jpg","/spots/spot4.webp","/spots/spot5.jpg","/spots/spot6.jpg","/spots/spot7.jpg"];
const ph = (i: number) => PHOTOS[((i % PHOTOS.length) + PHOTOS.length) % PHOTOS.length];

type Phase = "idle"|"shaking"|"flying"|"result";

export function QianPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fortuneData, setFortuneData] = useState<{
    grade: string; poem: string[]; spots: any[]
  } | null>(null);

  const startDraw = async () => {
    if (phase !== "idle") return;
    setPhase("shaking");
    try {
      const data = await fetch(`${BASE}/fortune/itinerary`).then(r => r.json());
      setFortuneData(data);
    } catch {
      // 失敗就用假資料 fallback（維持動畫不中斷）
      setFortuneData({
        grade: "大吉",
        poem: ["府城好日子","出遊保平安","里長齊相送","此行必大吉"],
        spots: []
      });
    }
    setTimeout(() => {
      setPhase("flying");
      setTimeout(() => setPhase("result"), 1000);
    }, 1200);
  };

  const reset = () => { setPhase("idle"); setFortuneData(null); };

  const gradeColor: Record<string, string> = {
    "上上大吉": "#FFD700", "大吉": "#f5ae85", "中吉": "#cf447a",
    "小吉": "#9c8ca6", "末吉": "#37516c",
  };
  const grade = fortuneData?.grade ?? "大吉";
  const gradeCol = gradeColor[grade] ?? "#f5ae85";

  return (
    <div className="lot-full-fullscreen-page">

      {/* ── BARREL + FLYING PHASE ── */}
      {(phase === "idle" || phase === "shaking" || phase === "flying") && (
        <div className="lot-stage-center">
          <div className="lot-header-text">
            <h1 className="lot-main-title">🎋 求吉籤</h1>
            <p className="lot-main-sub">誠心一搖，土地公為你指引今日去處</p>
          </div>

          {/* Incense smoke */}
          <div className="lot-smoke-row">
            {[0,1,2].map(i => <div key={i} className="lot-smoke" style={{animationDelay:`${i*0.35}s`}}/>)}
          </div>

          {/* 3D barrel */}
          <div className={`temple-fortune-barrel ${phase==="shaking"?"is-shaking":""}`}>
            <div className="barrel-top-ring"/>
            <div className="barrel-body">
              <div className="barrel-side"/>
              <div className="barrel-label">籤</div>
              <div className="barrel-shine"/>
            </div>
            <div className="barrel-base"/>
            <div className="barrel-sticks">
              {[{r:-12,h:90,d:0},{r:0,h:110,d:0.1},{r:14,h:85,d:0.2},{r:-6,h:100,d:0.05},{r:8,h:95,d:0.15}].map((s,i) => (
                <div key={i} className="stick-single" style={{transform:`rotate(${s.r}deg)`,height:`${s.h}px`,animationDelay:`${s.d}s`}}/>
              ))}
            </div>
          </div>

          {/* Flying stick */}
          {phase === "flying" && (
            <div className="flying-lot-stick-animation">
              <div className="gold-glow-trail"/>
              <div className="fortune-text-on-stick">上吉</div>
            </div>
          )}

          {/* Button */}
          <button type="button" className="lot-action-btn" onClick={startDraw} disabled={phase !== "idle"}>
            {phase === "idle" ? "誠心一搖，祈求吉籤" : phase === "shaking" ? "虔誠搖晃中…" : "吉籤飛出！"}
          </button>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === "result" && fortuneData && (
        <div className="lot-final-card-locked">
          <div className="lot-result-top">
            <div className="lot-dots-dec">✦ · ✦ · ✦</div>
            <div className="lot-slip-header">
              <span className="lot-slip-grade" style={{color:gradeCol}}>{grade}</span>
            </div>
            <div className="lot-dots-dec">✦ · ✦ · ✦</div>
          </div>

          <div className="lot-gold-bar"/>

          <div className="lot-poem-row">
            {(fortuneData.poem ?? []).map((l,i) => <span key={i} className="lot-poem-line">{l}</span>)}
          </div>

          <div className="lot-gold-bar"/>

          <div className="lot-spots-row">
            <p className="lot-spots-title">✦ 土地公今日為你安排 ✦</p>
            {(fortuneData.spots ?? []).length === 0 && (
              <p style={{color:"var(--text-secondary)",textAlign:"center",opacity:0.6,padding:"0.5rem"}}>景點資料載入中…</p>
            )}
            <div className="lot-spots-grid">
              {(fortuneData.spots ?? []).map((s: any, i: number) => (
                <div key={s.id ?? i} className="lot-spot-card">
                  <div className="lot-spot-order-badge">{i+1}</div>
                  <img src={ph(i)} alt={s.name} className="lot-spot-img" onError={e=>{(e.target as HTMLImageElement).src="/spots/spot1.jpg"}}/>
                  <div className="lot-spot-info">
                    <div className="lot-spot-order">第{["一","二","三"][i] ?? i+1}站</div>
                    <div className="lot-spot-name">{s.name}</div>
                    <div className="lot-spot-meta">⏰ {s.openHours || "建議停留 60 分鐘"}</div>
                    <div className="lot-spot-tag">{s.village ?? s.district}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lot-gold-bar"/>

          <div className="lot-divine">
            <span className="lot-divine-label">神明解曰</span>
            <p className="lot-divine-text">
              此籤{grade}，土地公親選{(fortuneData.spots ?? []).map((s:any)=>s.name).join("、") || "台南各景點"}，保佑旅途順遂、出入平安。
            </p>
          </div>

          <div className="lot-bottom-seal">✦ 土地公認證 · {grade} · 出入平安 ✦</div>

          <div className="lot-action-row">
            <button type="button" className="lot-confirm-btn" onClick={reset}>
              重新求籤 🎋
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
