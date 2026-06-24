import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../store/appStore";
import type { DayItinerary } from "../types";

const BACKEND_WS = (import.meta.env.VITE_BACKEND_WS ?? "ws://127.0.0.1:8080") + "/ws/explore";

// 把後端 agent_id 對應到里長名字與顏色
const AGENT_MAP: Record<string, { name: string; village: string; color: string }> = {
  art_district_dijizhu:     { name: "藝術區里長",   village: "中西區・藝術里",   color: "#8b244a" },
  central_district_dijizhu: { name: "中央區里長",   village: "中西區・中央里",   color: "#37516c" },
  snack_district_dijizhu:   { name: "小吃區里長",   village: "中西區・小吃里",   color: "#9c8ca6" },
  anping_dijizhu:           { name: "安平里長",     village: "安平區",           color: "#cf447a" },
  agent_art_district:       { name: "藝術區里長",   village: "中西區・藝術里",   color: "#8b244a" },
  agent_heritage_keeper:    { name: "古蹟區里長",   village: "中西區・古蹟里",   color: "#37516c" },
  agent_city_park:          { name: "公園區里長",   village: "仁德區・公園里",   color: "#9c8ca6" },
  agent_foodie_guide:       { name: "美食區里長",   village: "中西區・美食里",   color: "#cf447a" },
  chihkan_guard:            { name: "赤崁里長",     village: "中西區・赤崁里",   color: "#8b244a" },
  shennong_guard:           { name: "神農里長",     village: "中西區・神農里",   color: "#37516c" },
  market_guard:             { name: "市場里長",     village: "中西區・水仙里",   color: "#9c8ca6" },
  art_guard:                { name: "美術館里長",   village: "中西區・藝術里",   color: "#4a6a8a" },
  chimei_guard:             { name: "奇美里長",     village: "仁德區・奇美里",   color: "#6d1a38" },
  default:                  { name: "台南里長",     village: "台南市",           color: "#4a6a8a" },
};

function getAgent(agentId: string) {
  if (AGENT_MAP[agentId]) return AGENT_MAP[agentId];
  // 自動從 ID 生成里長名字
  const name = agentId
    .replace(/agent_|_guard|_dijizhu|_chief/g, "")
    .replace(/_/g, "")
    .slice(0, 4) + "里長";
  const colors = ["#8b244a","#37516c","#9c8ca6","#4a6a8a","#6d1a38","#2a3d52"];
  let h = 0; for (const c of agentId) h = c.charCodeAt(0) + ((h << 5) - h);
  return { name, village: "台南市", color: colors[Math.abs(h) % colors.length] };
}

export function useRealAgentWS(intentText: string, lat: number, lng: number, active: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const { addMessage, setTypingAgent, setItinerary, setWsStatus } = useAppStore();
  const dateStartRef = useRef("");
  const connectedRef = useRef(false);

  // 允許後續發送訊息
  const sendToWS = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (!active || !intentText) return;
    // 防止 StrictMode 雙重執行：已連線就不再建立
    if (connectedRef.current) return;
    connectedRef.current = true;

    setWsStatus("connecting");
    const ws = new WebSocket(BACKEND_WS);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      // 把 sendToWS 存入 store，讓 useWebSocket stub 也能發訊息
      useAppStore.getState().setSendToWS(sendToWS);
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ intent_text: intentText, lat, lng }));
        }
      }, 200);
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case "phase": {
          // 進度階段訊息 → 顯示為系統訊息
          const phaseLabels: Record<string, string> = {
            intent_extraction: "🔮 土地公正在解讀你的心願…",
            routing:           "📡 召集全台南地基主前哨探勘…",
            scouting:          "🏃 20位地基主正在飛奔探路…",
            bidding:           "🏷️ 地基主們開始搶著競標推薦…",
            debating:          "💬 里長們激烈討論中…",
            judging:           "⚖️ 土地公正在評判最佳行程…",
          };
          const label = phaseLabels[msg.phase] ?? msg.message ?? msg.phase;
          addMessage({
            id: `phase-${Date.now()}`,
            agentId: "system",
            agentName: "系統",
            agentType: "system" as any,
            content: label,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "agent_event": {
          const agentId = msg.agent ?? "unknown";
          const agentName = msg.agent_name ?? getAgent(agentId).name;  // 優先用後端給的里名
          const text = msg.text ?? "";
          const agent = getAgent(agentId);
          setTypingAgent(null);
          addMessage({
            id: `agent-${agentId}-${Date.now()}`,
            agentId,
            agentName,
            agentType: "village_chief",
            villageDistrict: agent.village,
            content: text,
            timestamp: new Date().toISOString(),
            attachedSpot: msg.attachedSpot ?? undefined,
          });
          break;
        }

        case "agent_join": {
          const agentId = msg.agent ?? "unknown";
          const agentName = msg.agent_name ?? getAgent(agentId).name;
          addMessage({
            id: `join-${agentId}-${Date.now()}`,
            agentId: "system",
            agentName: "系統",
            agentType: "system" as any,
            content: `📣 ${agentName} 加入討論`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "verdict_text": {
          addMessage({
            id: `verdict-${Date.now()}`,
            agentId: "tudigong",
            agentName: "土地公",
            agentType: "village_chief",
            content: `✦ 土地公神諭 ✦ ${msg.text}`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "task_broadcast": {
          // 只顯示提示訊息，不顯示原始 JSON
          addMessage({
            id: `broadcast-${Date.now()}`,
            agentId: "tudigong",
            agentName: "土地公",
            agentType: "village_chief",
            content: "✦ 土地公降旨 ✦ 任務發布！召集全台南地基主為你尋找最佳行程…",
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case "itinerary_update": {
          // 後端已送前端 DayItinerary 形狀，直接用，不需 parseItinerary
          const days: DayItinerary[] = (msg.data ?? []).map((d: any) => ({
            day: d.day,
            date: d.date ?? new Date().toISOString().split("T")[0],
            items: (d.items ?? []).map((item: any) => ({
              id: item.id,
              order: item.order,
              date: d.date ?? "",
              spot: {
                ...item.spot,
                images: [],
                rating: item.spot.rating ?? 4.5,
              },
              durationMinutes: item.durationMinutes,
              note: item.note ?? "",
            })),
          }));
          if (days.length > 0) setItinerary(days);
          setWsStatus("connected");
          break;
        }

        case "replacement_suggestions": {
          useAppStore.getState().setActiveReplacements({
            itemId: msg.itemId,
            suggestions: (msg.suggestions ?? []).map((s: any) => ({
              spot: { ...s.spot, images: [], rating: 4.5 },
              reason: s.reason,
              tags: s.tags ?? [],
            })),
          });
          break;
        }

        case "error": {
          addMessage({
            id: `err-${Date.now()}`,
            agentId: "system",
            agentName: "系統",
            agentType: "system" as any,
            content: `⚠️ ${msg.message ?? "連線發生錯誤"}`,
            timestamp: new Date().toISOString(),
          });
          break;
        }
        default: {
          // 忽略未知類型的訊息，絕不顯示原始 JSON
          console.debug("未知訊息類型:", msg.type, msg);
          break;
        }
      }
    };

    ws.onclose = () => { setWsStatus("disconnected"); wsRef.current = null; };
    ws.onerror = () => {
      setWsStatus("disconnected");
      addMessage({
        id: `conn-err-${Date.now()}`,
        agentId: "system",
        agentName: "系統",
        agentType: "system" as any,
        content: "⚠️ 無法連線到後端，改用示範模式",
        timestamp: new Date().toISOString(),
      });
    };

    return () => { ws.close(); wsRef.current = null; connectedRef.current = false; };
  }, [active, intentText, lat, lng]);

  return { dateStartRef, sendToWS };
}

// 讓 ChatRoom 能透過已連線的 WebSocket 發送 chat/remove/replace 訊息
export function useWebSocket(_sessionId: string | null) {
  const sendToWS = useAppStore(state => state.sendToWS);

  const sendChatMessage = useCallback((content: string) => {
    sendToWS?.({ type: "chat", content });
  }, [sendToWS]);

  const sendRemoveItem = useCallback((itemId: string) => {
    sendToWS?.({ type: "remove_item", itemId });
  }, [sendToWS]);

  const sendReplaceItem = useCallback((itemId: string, newSpotId: string) => {
    sendToWS?.({ type: "replace_item", itemId, newSpotId });
  }, [sendToWS]);

  const sendFinalizeItinerary = useCallback(() => {
    sendToWS?.({ type: "finalize_itinerary" });
  }, [sendToWS]);

  return { sendChatMessage, sendRemoveItem, sendReplaceItem, sendFinalizeItinerary };
}
