import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import type { ItineraryItem, ReplacementSuggestion } from "../../types";

const SESSION_ID = "demo-session-001";
const PHOTOS = ["/spots/spot1.jpg","/spots/spot2.jpg","/spots/spot3.jpg","/spots/spot4.webp","/spots/spot5.jpg","/spots/spot6.jpg","/spots/spot7.jpg"];
const TRANSPORT_ICON: Record<string,string> = {walk:"🚶",scooter:"🛵",taxi:"🚕",bus:"🚌",car:"🚗",transit:"🚌"};
const TRANSPORT_LABEL: Record<string,string> = {walk:"步行",scooter:"機車",taxi:"計程車",bus:"公車",car:"開車",transit:"大眾運輸"};

function getTransportDisplay(mode: string, minutes: number) {
  const icon = TRANSPORT_ICON[mode] ?? "🚶";
  const label = TRANSPORT_LABEL[mode] ?? mode;
  return `${icon} ${label} ${minutes}分`;
}

function getPhoto(id: string) {
  let h = 0; for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h);
  return PHOTOS[Math.abs(h) % PHOTOS.length];
}

const MOCK_SUGGESTIONS: ReplacementSuggestion[] = [
  { spot:{ id:"r1",name:"赤崁樓",district:"中西區",village:"赤崁里",address:"台南市中西區",openHours:"08:30–21:30",description:"",tags:["🏯 古蹟","⭐ 必訪"] }, reason:"步行即可抵達的熱門景點", tags:["🚶 走路5分鐘","🔥 好評4000+"] },
  { spot:{ id:"r2",name:"神農街",district:"中西區",village:"神農里",address:"台南市中西區",openHours:"全天開放",description:"",tags:["🌃 夜遊","🛍️ 文創"] }, reason:"氛圍相近的在地老街", tags:["🌟 在地首選","📸 超好拍"] },
];

// 擲筊 SVG 組件
function PoeCup({ side, flipped }: { side: "left"|"right"; flipped: boolean }) {
  return (
    <svg className={`poe-cup poe-cup--${side}`} viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      {/* Cup body */}
      <ellipse cx="30" cy="20" rx="22" ry="8" fill="#8b244a"/>
      <path d="M8 20 Q6 50 15 70 Q30 78 45 70 Q54 50 52 20 Z" fill="#cf447a"/>
      {/* Flat side when flipped */}
      {flipped && <ellipse cx="30" cy="72" rx="18" ry="5" fill="rgba(255,215,0,0.6)"/>}
      {/* Shine */}
      <ellipse cx="22" cy="30" rx="6" ry="12" fill="rgba(255,255,255,0.15)" transform="rotate(-15 22 30)"/>
      {/* Bottom */}
      <ellipse cx="30" cy="70" rx="14" ry="5" fill="#6d1a38"/>
    </svg>
  );
}

function PoeOverlay({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="poe-overlay">
      <div className="poe-container" style={{ position: "relative" }}>
        <p className="poe-title">✦ 請示土地公 ✦</p>
        <div className="poe-cups">
          <PoeCup side="left" flipped={false} />
          <PoeCup side="right" flipped={true} />
        </div>
        <p className="poe-result">🪙 聖筊！神明認可此行程！</p>
        {/* Gold sparks */}
        <div className="poe-sparks">
          <svg viewBox="0 0 200 200" width="200" height="200" style={{ position:"absolute", top:"-60px", left:"-60px" }}>
            {[0,45,90,135,180,225,270,315].map((deg,i) => (
              <line key={i}
                x1="100" y1="100"
                x2={100 + 80*Math.cos(deg*Math.PI/180)}
                y2={100 + 80*Math.sin(deg*Math.PI/180)}
                stroke="#FFD700" strokeWidth="2" opacity="0.8"
                style={{ transformOrigin:"100px 100px" }}
              />
            ))}
            {[22,67,112,157,202,247,292,337].map((deg,i) => (
              <circle key={`c${i}`}
                cx={100 + 70*Math.cos(deg*Math.PI/180)}
                cy={100 + 70*Math.sin(deg*Math.PI/180)}
                r="4" fill="#FFD700" opacity="0.9"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

interface Props { item: ItineraryItem; isFirst: boolean; }

export function ItineraryCard({ item, isFirst }: Props) {
  const { activeReplacements, setActiveReplacements, removeItineraryItem, replaceItineraryItem } = useAppStore();
  const { sendRemoveItem, sendReplaceItem } = useWebSocket(SESSION_ID);

  // Step 1: isFlipped = card flipped showing suggestions
  const [isFlipped, setIsFlipped] = useState(false);
  // Step 2: isPoing = divination animation running
  const [isPoing, setIsPoing] = useState(false);
  // Step 3: isBlessed = gold border flash after success
  const [isBlessed, setIsBlessed] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<ReplacementSuggestion | null>(null);

  const suggestions = activeReplacements?.suggestions ?? MOCK_SUGGESTIONS;
  const photo = item.spot.imageUrl || getPhoto(item.spot.id);

  // Step 1: delete → flip
  const handleDelete = () => {
    setIsFlipped(true);
    removeItineraryItem(item.id);
    sendRemoveItem(item.id);
  };

  // Step 2: user picks a suggestion → trigger poe
  const handleDivineAsk = (s: ReplacementSuggestion) => {
    setPendingSuggestion(s);
    setIsPoing(true);
  };

  // Step 3: after animation → replace + gold flash
  const handlePoeComplete = () => {
    if (!pendingSuggestion) return;
    setIsPoing(false);
    replaceItineraryItem(item.id, { ...item, id: `replaced-${Date.now()}`, spot: pendingSuggestion.spot });
    sendReplaceItem(item.id, pendingSuggestion.spot.id);
    setIsFlipped(false);
    setActiveReplacements(null);
    setPendingSuggestion(null);
    // Trigger gold border
    setIsBlessed(true);
    setTimeout(() => setIsBlessed(false), 2000);
  };

  // Auto-complete poe after 2s
  if (isPoing) {
    setTimeout(handlePoeComplete, 2000);
  }

  return (
    <>
      {isPoing && <PoeOverlay onComplete={handlePoeComplete} />}

      <div className="itinerary-card-wrapper">
        {!isFirst && item.transportFromPrev && (
          <div className="transport-connector">
            <div className="connector-line"/>
            <span className="transport-badge">{getTransportDisplay(item.transportFromPrev, item.travelMinutes ?? item.spot.walkMinutesFromPrev ?? 0)}</span>
            <div className="connector-line"/>
          </div>
        )}

        <div className={`itinerary-card ${isBlessed ? "itinerary-card--blessed" : ""}`}>
          <div className={`card-flip-inner ${isFlipped ? "flipped" : ""}`}>
            {/* FRONT */}
            <div className="card-front">
              <div className="card-img-wrap">
                <img src={photo} alt={item?.spot?.name} className="card-img" onError={(e)=>{(e.target as HTMLImageElement).src="/spots/spot1.jpg"}} />
                <div className="card-img-overlay"/>
                <div className="card-order-badge">{item.order}</div>
                <button type="button" className="card-delete-btn" onClick={handleDelete}>✕</button>
              </div>
              <div className="card-body">
                <div className="card-spot-name">{item?.spot?.name}</div>
                <div className="card-meta">
                  <span className="card-district">📍 {item.spot.village} · {item.spot.district}</span>
                  <span className="card-hours">⏰ {item.spot.openHours}</span>
                </div>
                {item.spot.tags && <div className="card-tags">{item.spot.tags.map(t => <span key={t} className="spot-tag">{t}</span>)}</div>}
                {item?.spot?.lat && item?.spot?.lng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item?.spot?.name + " " + item.spot.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="gmaps-btn"
                    style={{marginTop:6,display:"inline-flex"}}
                    onClick={e => e.stopPropagation()}
                  >
                    🗺 Google Maps 導航
                  </a>
                )}
              </div>
            </div>

            {/* BACK */}
            <div className="card-back">
              <div className="card-back-inner">
                <p className="card-back-title">✦ 里長智慧推薦替換</p>
                {suggestions.map(s => (
                  <div key={s.spot.id}>
                    <div className="replacement-option">
                      <img src={getPhoto(s.spot.id)} alt={s.spot.name} className="replacement-thumb"/>
                      <div className="replacement-info">
                        <div className="replacement-highlight">{s.tags.join(" · ")}</div>
                        <div className="replacement-name">{s.spot.name}</div>
                        <div className="replacement-reason">{s.reason}</div>
                      </div>
                    </div>
                    <button type="button" className="divine-ask-btn" onClick={() => handleDivineAsk(s)}>
                      🪙 請示神明，確定替換
                    </button>
                  </div>
                ))}
                <button type="button" className="card-back-cancel" onClick={() => { setIsFlipped(false); setActiveReplacements(null); }}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
