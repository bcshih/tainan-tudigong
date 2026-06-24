import type { ChatMessage } from "../../types";

const AGENT_COLORS = ["#37516c","#8b244a","#9c8ca6","#4a6a8a","#6d1a38","#2a3d52","#8b5a2b"];

// 里長名字對應顏色
function getColor(id: string) {
  let h = 0;
  for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h);
  return AGENT_COLORS[Math.abs(h) % AGENT_COLORS.length];
}

// 根據 agentId 或 agentName 判斷顯示名稱
function getDisplayName(message: ChatMessage): string {
  if (message.agentName) return message.agentName;
  const id = message.agentId ?? "";
  if (id.includes("anping"))   return "安平里長";
  if (id.includes("shennong")) return "神農里長";
  if (id.includes("zhongzhou"))return "中洲里長";
  if (id.includes("yonghua"))  return "永華里長";
  if (id.includes("art"))      return "藝術區里長";
  if (id.includes("heritage")) return "古蹟區里長";
  if (id.includes("city"))     return "公園區里長";
  if (id.includes("foodie"))   return "美食區里長";
  if (id.includes("chihkan"))  return "赤崁里長";
  if (id.includes("chimei"))   return "奇美里長";
  if (id.includes("market"))   return "市場里長";
  if (id.includes("tudigong")) return "土地公";
  return id.replace(/_/g," ").replace("agent","").replace("guard","里長").trim() || "里長";
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser   = message.agentType === "user";
  const isSystem = (message.agentType as string) === "system";
  const isTudigong = message.agentId === "tudigong" || message.content?.startsWith("✦");

  if (isSystem) return (
    <div className="system-message">
      <span>{message.content}</span>
    </div>
  );

  const displayName = getDisplayName(message);

  return (
    <div className={`message-row ${isUser ? "user-row" : "agent-row"}`}>

      {/* Agent avatar — 只有 agent 有頭貼，靠左 */}
      {!isUser && (
        <div className="agent-info">
          <div className={`agent-avatar ${isTudigong ? "agent-avatar--glow" : ""}`}
            style={{
              background: isTudigong
                ? "linear-gradient(135deg,#8b244a,#FFD700)"
                : getColor(message.agentId ?? ""),
            }}>
            {displayName[0]}
          </div>
          <span className="agent-name">{displayName}</span>
          {message.villageDistrict && (
            <span className="agent-district">{message.villageDistrict}</span>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        className={`bubble ${isUser ? "user-bubble" : isTudigong ? "agent-bubble agent-bubble--divine" : "agent-bubble"}`}
        style={isTudigong ? {
          background: "linear-gradient(90deg,#8b0000,#c49a23)",
          color: "white",
          border: "2px solid var(--gold)",
          boxShadow: "0 0 25px #ffd700,inset 0 0 15px rgba(255,215,0,0.2)",
        } : {}}
      >
        {isTudigong && <div className="divine-badge">🏮 土地公降旨</div>}
        {message.isTyping
          ? <div className="typing-indicator"><span/><span/><span/></div>
          : <>
              <p className="bubble-text">{message.content}</p>
              {message.attachedSpot && (
                <div className="spot-card-mini">
                  <span className="spot-mini-name">📍 {message.attachedSpot.name}</span>
                  <span className="spot-mini-hours">⏰ {message.attachedSpot.openHours}</span>
                  {message.attachedSpot.rating && (
                    <span className="spot-mini-rating">⭐ {message.attachedSpot.rating}</span>
                  )}
                </div>
              )}
              {message.tags && message.tags.length > 0 && (
                <div className="bubble-tags">
                  {message.tags.map(t => <span key={t} className="bubble-tag">{t}</span>)}
                </div>
              )}
            </>
        }
      </div>

      {/* 用戶：沒有頭貼，只有訊息靠右 */}
    </div>
  );
}
