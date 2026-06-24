import { useState, useEffect } from "react";

interface Props { onAccept: () => void; onDecline: () => void; }

export function NeighborPopup({ onAccept, onDecline }: Props) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = (cb: () => void) => { setLeaving(true); setTimeout(cb, 400); };

  // Auto dismiss after 10s
  useEffect(() => {
    const t = setTimeout(() => dismiss(onDecline), 10000);
    return () => clearTimeout(t);
  }, []);

  return (
    /* Fixed position floating card — NOT inline in message flow */
    <div className={`neighbor-float ${leaving ? "neighbor-float--out" : ""}`}>
      <div className="neighbor-popup">
        <button type="button" className="neighbor-close" onClick={() => dismiss(onDecline)}>✕</button>
        <div className="neighbor-popup-header">
          <div className="neighbor-avatar">🦁</div>
          <div className="neighbor-from">
            <span className="neighbor-label">突擊自薦</span>
            <span className="neighbor-name">安平里長</span>
          </div>
          <div className="neighbor-live-dot"/>
        </div>
        <p className="neighbor-msg">
          嗨！我是<strong>安平里長</strong>！聽說你在規劃台南行程，
          安平古堡最近剛好有<strong>特展</strong>，要不要加進去看看？
        </p>
        <div className="neighbor-img-wrap">
          <img src="/spots/spot3.jpg" alt="安平古堡" className="neighbor-img"/>
          <div className="neighbor-img-tags">
            <span className="neighbor-img-tag">🏰 特展限定</span>
            <span className="neighbor-img-tag">📸 必拍</span>
          </div>
        </div>
        <div className="neighbor-actions">
          <button type="button" className="neighbor-btn neighbor-btn--yes" onClick={() => dismiss(onAccept)}>好！加入行程</button>
          <button type="button" className="neighbor-btn neighbor-btn--no" onClick={() => dismiss(onDecline)}>下次再說</button>
        </div>
      </div>
    </div>
  );
}
