import { useState } from "react";

interface PropItem {
  id: string;
  img: string;
  name: string;
  tags: string[];
  chiefQuote: string;
  stayTime: string;
  transport: string;
}

interface Props {
  prop: PropItem;
  onClose: () => void;
  onAdd: (prop: PropItem) => void;
}

export function PropModal({ prop, onClose, onAdd }: Props) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => { onAdd(prop); onClose(); }, 600);
  };

  return (
    <div className="prop-modal-overlay" onClick={onClose}>
      <div className="prop-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="prop-modal-close" onClick={onClose}>✕</button>
        <img src={prop.img} alt={prop.name} className="prop-modal-img"/>
        <div className="prop-modal-body">
          <div className="prop-modal-tags">{prop.tags.map(t => <span key={t} className="prop-tag">{t}</span>)}</div>
          <h3 className="prop-modal-name">{prop.name}</h3>
          <div className="prop-modal-quote">
            <span className="quote-icon">💬</span>
            <p>「{prop.chiefQuote}」</p>
          </div>
          <div className="prop-modal-meta">
            <span>⏱ 預估停留 {prop.stayTime}</span>
            <span>🚗 {prop.transport}</span>
          </div>
        </div>
        <div className="prop-modal-actions">
          <button type="button" className={`prop-modal-btn prop-modal-btn--add ${added ? "added" : ""}`} onClick={handleAdd}>
            {added ? "✓ 已加入清單" : "放入我的清單"}
          </button>
          <button type="button" className="prop-modal-btn prop-modal-btn--skip" onClick={onClose}>
            暫不考慮
          </button>
        </div>
      </div>
    </div>
  );
}

export type { PropItem };
