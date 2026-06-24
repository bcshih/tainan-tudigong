import { useState, useEffect } from "react";
import type { Spot } from "../../types";

interface Props {
  spot: Spot;
  agentName: string;
  agentColor: string;
  mode: "fullscreen" | "expand";
  onConfirm: () => void;
  onSkip: () => void;
}

const GRADES = ["上上大吉","出行大吉","萬事如意","旅途順遂","大展鴻圖"];
const POEMS = [
  ["府城古都千年情","此景非遊枉此行","里長引路福星臨","不虛此行大吉祥"],
  ["神明指引步步行","古蹟巡禮福氣來","台南美景入心懷","千里尋訪此一處"],
  ["香火鼎盛土地公","保佑旅人行路順","此景藏於府城中","有緣得見必留連"],
  ["里長親薦此好地","神明認可賜吉籤","遊覽府城得圓滿","平安喜樂滿載歸"],
];
const PHOTOS = ["/spots/spot1.jpg","/spots/spot2.jpg","/spots/spot3.jpg","/spots/spot4.webp","/spots/spot5.jpg","/spots/spot6.jpg","/spots/spot7.jpg"];

function seed(s: string) { let h=0; for(const c of s) h=c.charCodeAt(0)+((h<<5)-h); return Math.abs(h); }

export function SpotFlashCard({ spot, agentName, agentColor, mode, onConfirm, onSkip }: Props) {
  const [phase, setPhase] = useState<"enter"|"show"|"exit">("enter");
  const [confirmed, setConfirmed] = useState(false);

  const n = seed(spot.id);
  const grade = GRADES[n % GRADES.length];
  const poem  = POEMS[n % POEMS.length];
  const luckyNum = (n % 48) + 1;
  const photo = PHOTOS[n % PHOTOS.length];

  useEffect(() => {
    const t = setTimeout(() => setPhase("show"), mode === "fullscreen" ? 650 : 280);
    return () => clearTimeout(t);
  }, [mode]);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => { setPhase("exit"); setTimeout(onConfirm, 700); }, 400);
  };
  const handleSkip = () => { setPhase("exit"); setTimeout(onSkip, 550); };

  return (
    <div
      className={`fortune-backdrop fortune-bd--${phase}`}
      onClick={e => { if (e.target === e.currentTarget && phase === "show") handleSkip(); }}
    >
      {/* Gold particles — only on fullscreen enter */}
      {phase === "show" && mode === "fullscreen" && (
        <div className="fortune-particles" aria-hidden>
          {Array.from({length:24}).map((_,i) => (
            <div key={i} className="fortune-particle" style={{
              "--angle":`${i*15}deg`,
              "--dist":`${120+(i%4)*40}px`,
              "--delay":`${(i%6)*0.05}s`,
              "--size":`${4+(i%4)*4}px`,
            } as React.CSSProperties}/>
          ))}
        </div>
      )}

      <div className={`fortune-slip fortune-slip--${phase} fortune-slip--${mode}`}>
        {/* RED TOP */}
        <div className="fortune-top">
          <div className="fortune-dots"/>
          <div className="fortune-header">
            <span className="fortune-num">第 {luckyNum} 籤</span>
            <span className="fortune-grade">{grade}</span>
            <span className="fortune-num">{agentName}推薦</span>
          </div>
          <div className="fortune-dots"/>
        </div>

        <div className="fortune-gold-bar"/>

        {/* POEM */}
        <div className="fortune-poem-wrap">
          {poem.map((l,i) => <p key={i} className="fortune-poem-line">{l}</p>)}
        </div>

        <div className="fortune-gold-bar"/>

        {/* SPOT */}
        <div className="fortune-body">
          <div className="fortune-img-wrap">
            <img src={photo} alt={spot.name} className="fortune-img"/>
            {spot.rating && <div className="fortune-img-rating">⭐ {spot.rating}</div>}
          </div>
          <div className="fortune-spot-detail">
            <div className="fortune-agent-pill" style={{background:agentColor}}>{agentName}推薦</div>
            <h2 className="fortune-spot-name">{spot.name}</h2>
            <p className="fortune-spot-meta">📍 {spot.village} · {spot.district}</p>
            <p className="fortune-spot-meta">⏰ {spot.openHours}</p>
            {spot.description && <p className="fortune-spot-desc">{spot.description}</p>}
            {spot.tags && (
              <div className="fortune-spot-tags">
                {spot.tags.map(t => <span key={t} className="fortune-spot-tag">{t}</span>)}
              </div>
            )}
          </div>
        </div>

        <div className="fortune-gold-bar"/>

        {/* DIVINE WORD */}
        <div className="fortune-divine">
          <span className="fortune-divine-label">神明解曰</span>
          <p className="fortune-divine-text">
            {spot.name}乃府城精華，{agentName}親薦，土地公保佑旅途順遂、出入平安、不虛此行。
          </p>
        </div>

        {/* RED BOTTOM */}
        <div className="fortune-bottom">
          <div className="fortune-dots"/>
          <p className="fortune-seal">✦ 土地公認證 · 里長掛保 · 出入平安 ✦</p>
          <div className="fortune-dots"/>
        </div>

        {/* BUTTONS */}
        {phase === "show" && (
          <div className="fortune-btns">
            {confirmed ? (
              <div className="fortune-confirmed">✓ 已加入推薦清單</div>
            ) : (
              <>
                <button type="button" className="fortune-btn-yes" onClick={handleConfirm}>
                  🙏 收下此籤，加入行程
                </button>
                <button type="button" className="fortune-btn-no" onClick={handleSkip}>
                  暫不考慮
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
