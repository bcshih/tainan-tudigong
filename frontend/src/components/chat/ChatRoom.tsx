import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "../../store/appStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useMockAgents } from "../../hooks/useMockAgents";
import { MessageBubble } from "./MessageBubble";
import { SpotFlashCard } from "./SpotFlashCard";
import type { Spot } from "../../types";
import { AnimatedJiubei } from "../theater/Jiaobei";

const SESSION_ID = "demo-session-001";
const WEATHER_KEY = import.meta.env.VITE_WEATHER_KEY as string;

const AGENTS = [
  { id:"anping_chief",    name:"安平里長", village:"安平區·安平里", color:"#8b244a", badge:"🦁", online:true },
  { id:"shennong_chief",  name:"神農里長", village:"中西區·神農里", color:"#37516c", badge:"🏯", online:true },
  { id:"zhongzhou_chief", name:"中洲里長", village:"仁德區·中洲里", color:"#9c8ca6", badge:"🎭", online:true },
  { id:"yonghua_chief",   name:"永華里長", village:"北門區·永華里", color:"#4a6a8a", badge:"🌊", online:false },
];

interface SavedSpot { spot:Spot; agentName:string; agentColor:string; }
interface QueuedSpot extends SavedSpot { id: string; }

const FORTUNE_KEY = "popped_fortunes";
type PoeResult = "sheng"|"yin"|"xiao";

// Small inline weather poe component for遊府城
function WeatherPoeBtn() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle"|"ready"|"throwing"|"result">("idle");
  const [result, setResult] = useState<PoeResult|null>(null);
  const [weather, setWeather] = useState<{temp:number;desc:string;main:string}|null>(null);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [shake, setShake] = useState(false);

  const WEATHER_MAP: Record<string,PoeResult> = {Clear:"sheng",Clouds:"yin",Rain:"xiao",Drizzle:"xiao",Thunderstorm:"xiao",Snow:"yin",Mist:"yin",Fog:"yin",Haze:"yin"};
  const POE_COLOR: Record<PoeResult,string> = {sheng:"#FFD700",yin:"#9c8ca6",xiao:"#f69d92"};

  useEffect(() => {
    if (!open) return;
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=22.9999&lon=120.2269&appid=${WEATHER_KEY}&units=metric&lang=zh_tw`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.weather && d.main) {
          setWeather({
            temp: Math.round(d.main.temp),
            desc: d.weather[0].description,
            main: d.weather[0].main,
          });
        }
      })
      .catch(err => {
        console.warn("天氣 API 失敗:", err);
        // Fallback: set a mock weather so the button still works
        setWeather({ temp: 29, desc: "晴時多雲", main: "Clouds" });
      });
  }, [open]);

  const handleThrow = () => {
    if (phase!=="ready") return;
    
    const res: PoeResult = weather ? (WEATHER_MAP[weather.main]??"yin") : (["sheng","yin","xiao"][Math.floor(Math.random()*3)] as PoeResult);
    setResult(res);
    if(res==="sheng"){setC1(false);setC2(true);}
    else if(res==="yin"){setC1(false);setC2(false);}
    else{setC1(true);setC2(true);}

    setPhase("throwing");
    setShake(true); setTimeout(()=>setShake(false),600);

    setTimeout(() => {
      setPhase("result");
    }, 1200);
  };

  const getMsg = () => {
    if (!result) return "";
    if (result==="sheng") return weather ? `土地公應允：今日台南 ${weather.temp}°C ${weather.desc}，出行大吉！` : "土地公應允：今日出行大吉！";
    return "神明提示天機不可洩漏，出行請隨身攜帶雨具，多加小心。";
  };

  const reset = () => { setPhase("idle"); setResult(null); setC1(false); setC2(false); };

  if (!open) return (
    <button type="button" className="weather-poe-mini-btn" onClick={()=>setOpen(true)}>
      🪙 問天氣
    </button>
  );

  return (
    <div className={`weather-poe-panel ${shake?"weather-poe-shake":""}`}>
      <div className="weather-poe-panel-header">
        <span className="weather-poe-title">☁️ 擲筊問天氣</span>
        <button type="button" className="weather-poe-close" onClick={()=>{setOpen(false);reset();}}>✕</button>
      </div>
      {weather && phase!=="result" && <div className="weather-poe-info">台南現在 {weather.temp}°C · {weather.desc}</div>}
      <div style={{ transform: "scale(0.8)", transformOrigin: "center" }}>
        <AnimatedJiubei phase={phase} c1={c1} c2={c2} />
      </div>
      {phase==="idle" && <button type="button" className="weather-poe-pickup" onClick={()=>setPhase("ready")}>🙏 捧起筊杯</button>}
      {phase==="ready" && <button type="button" className="weather-poe-throw" onClick={handleThrow}>🎯 擲出！</button>}
      {phase==="result" && result && (
        <div className="weather-poe-result">
          <div style={{color:POE_COLOR[result],fontWeight:700,fontSize:"1rem",marginBottom:8}}>
            {result==="sheng"?"☀️ 聖筊":result==="yin"?"⛅ 陰筊":"🌧️ 笑筊"}
          </div>
          <p style={{fontSize:"0.88rem",color:"var(--text-primary)",lineHeight:1.6,textAlign:"center"}}>{getMsg()}</p>
          <button type="button" className="weather-poe-done" onClick={()=>{reset();setOpen(false);}}>感謝土地公 🙏</button>
        </div>
      )}
    </div>
  );
}

export function ChatRoom() {
  const { messages, wsStatus, phase, setPhase, pendingAgentMessages } = useAppStore();
  const { sendChatMessage, sendFinalizeItinerary } = useWebSocket(SESSION_ID);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 5. Queue-based flash mechanism
  const [fortuneQueue, setFortuneQueue] = useState<QueuedSpot[]>([]);
  const [savedSpots, setSavedSpots] = useState<SavedSpot[]>([]);
  const [expandSpot, setExpandSpot] = useState<SavedSpot|null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => { return () => { sessionStorage.removeItem("mock_agents_started"); }; }, []);
  useMockAgents(true);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  // Watch messages — push ALL new spots into queue
  useEffect(() => {
    if (phase !== "chat") return;
    if (messages.length === 0) return;

    const latest = messages[messages.length - 1];
    if (latest.isTyping || latest.agentType !== "village_chief") return;
    if (!latest.attachedSpot) return;

    const popped: string[] = JSON.parse(sessionStorage.getItem(FORTUNE_KEY) || "[]");
    const agent = AGENTS.find(a => a.id === latest.agentId);
    const spot = latest.attachedSpot;

    if (!seenRef.current.has(spot.id) && !popped.includes(spot.id)) {
      seenRef.current.add(spot.id);
      popped.push(spot.id);
      sessionStorage.setItem(FORTUNE_KEY, JSON.stringify(popped));
      setFortuneQueue(q => [...q, {
        id: spot.id,
        spot,
        agentName: latest.agentName,
        agentColor: agent?.color ?? "#cf447a",
      }]);
    }
  }, [messages, phase]);

  // Current flash = head of queue
  const currentFlash = fortuneQueue[0] ?? null;

  const releasePending = useCallback(() => {
    const pending = useAppStore.getState().shiftPendingAgentMessage();
    if (!pending) return;
    setTimeout(() => {
      useAppStore.getState().setTypingAgent(pending.agentId);
      setTimeout(() => {
        useAppStore.getState().setTypingAgent(null);
        useAppStore.getState().addMessage({
          id: `pending-${pending.agentId}-${Date.now()}`,
          agentId: pending.agentId,
          agentName: pending.agentName,
          agentType: "village_chief",
          villageDistrict: pending.villageDistrict,
          content: pending.content,
          timestamp: new Date().toISOString(),
          attachedSpot: pending.attachedSpot,
        });
      }, 1200);
    }, 600);
  }, []);

  // Release first pending message when component mounts and has pending
  useEffect(() => {
    if (pendingAgentMessages.length > 0 && fortuneQueue.length === 0) {
      releasePending();
    }
  }, [pendingAgentMessages.length, fortuneQueue.length]);

  const handleConfirm = useCallback(() => {
    setFortuneQueue(q => {
      const [first, ...rest] = q;
      if (first) setSavedSpots(s => [...s, first]);
      return rest;
    });
    // 收下籤後釋放下一條 agent 訊息
    setTimeout(() => releasePending(), 800);
  }, [releasePending]);

  const handleSkip = useCallback(() => {
    setFortuneQueue(q => q.slice(1)); // skip current, show next
  }, []);

  const handleFinalize = () => {
    const { pendingAgentMessages, itinerary, setItinerary, wsStatus } = useAppStore.getState();
    
    // 如果是真實連線模式，我們直接切換到 itinerary view 等待（或看已經產生的），並發送 finalize
    if (wsStatus === "connected") {
      sendFinalizeItinerary();
      setPhase("itinerary");
      return;
    }

    // 否則如果是 Mock 模式，用 savedSpots 產生假行程
    if (pendingAgentMessages.length > 0 && itinerary.length === 0) {
      // 把剩餘待推送景點直接組成行程
      const items = pendingAgentMessages.map((p, idx) => ({
        id: `final-${p.agentId}-${idx}`,
        order: idx + 1 + savedSpots.length,
        spot: p.attachedSpot!,
        durationMinutes: 90,
        note: "",
      }));
      const savedItems = savedSpots.map((s, idx) => ({
        id: `saved-${s.spot.id}-${idx}`,
        order: idx + 1,
        spot: s.spot,
        durationMinutes: 90,
        note: "",
      }));
      setItinerary([{ day: 1, date: new Date().toISOString().split("T")[0], items: [...savedItems, ...items] }]);
    } else if (itinerary.length === 0 && savedSpots.length > 0) {
      // 用收下的吉籤景點組成行程
      const savedItems = savedSpots.map((s, idx) => ({
        id: `saved-${s.spot.id}-${idx}`,
        order: idx + 1,
        spot: s.spot,
        durationMinutes: 90,
        note: "",
      }));
      setItinerary([{ day: 1, date: new Date().toISOString().split("T")[0], items: savedItems }]);
    }
    sendFinalizeItinerary();
    setPhase("itinerary");
  };

  const handleSend = () => {
    const t = input.trim(); if (!t) return;
    useAppStore.getState().addMessage({ id:`user-${Date.now()}`, agentId:"user", agentName:"我", agentType:"user", content:t, timestamp:new Date().toISOString() });
    sendChatMessage(t); setInput("");
    const online = AGENTS.filter(a => a.online);
    const picked = online[Math.floor(Math.random()*online.length)];
    const replies = [`收到！「${t}」讓我跟其他里長討論！`,`「${t}」我最擅長了，馬上推薦！`,`「${t}」稍等，我去問問其他里長！`];
    setTimeout(() => {
      useAppStore.getState().setTypingAgent(picked.id);
      setTimeout(() => {
        useAppStore.getState().setTypingAgent(null);
        useAppStore.getState().addMessage({ id:`reply-${Date.now()}`, agentId:picked.id, agentName:picked.name, agentType:"village_chief", villageDistrict:picked.village, content:replies[Math.floor(Math.random()*replies.length)], timestamp:new Date().toISOString() });
      }, 1600);
    }, 400);
  };

  return (
    <div className="chatroom">
      {currentFlash && !expandSpot && phase === "chat" && (
        <SpotFlashCard spot={currentFlash.spot} agentName={currentFlash.agentName} agentColor={currentFlash.agentColor} mode="fullscreen" onConfirm={handleConfirm} onSkip={handleSkip}/>
      )}
      {expandSpot && (
        <SpotFlashCard spot={expandSpot.spot} agentName={expandSpot.agentName} agentColor={expandSpot.agentColor} mode="expand"
          onConfirm={() => setExpandSpot(null)}
          onSkip={() => { setSavedSpots(s=>s.filter(x=>x.spot.id!==expandSpot.spot.id)); setExpandSpot(null); }}/>
      )}

      <div className="chat-main">
        <header className="chat-header">
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div className="chat-title-group">
              <h2 className="chat-title">台南里長會議室</h2>
              <p className="chat-subtitle">AI × 在地智慧 · 府城伯樂圓桌會議</p>
            </div>
            <div className={`ws-status ws-status--${wsStatus}`}>
              <span className="ws-dot"/>
              {wsStatus==="connected"?"里長在線":wsStatus==="connecting"?"召集中…":"未連線"}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {/* 6. Weather poe button */}
            <WeatherPoeBtn/>
            <button type="button" className="finalize-btn" onClick={handleFinalize}>產生行程單 →</button>
          </div>
        </header>

        <div className="messages-area">
          {messages.length===0 && (
            <div className="empty-chat">
              <div className="empty-chat-icon">🏯</div>
              <p>里長們正在趕來…</p>
              <p style={{fontSize:"0.85rem",marginTop:4}}>他們會搶著跟你說話！</p>
            </div>
          )}
          {messages.map(msg=><MessageBubble key={msg.id} message={msg}/>)}
          <div ref={bottomRef}/>
        </div>

        <div className="chat-input-bar">
          <input className="chat-input" placeholder="跟里長們說說你的想法…"
            value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSend()}/>
          <button type="button" className="send-btn" onClick={handleSend} disabled={!input.trim()}>送出</button>
        </div>
      </div>

      <div className="chat-sidebar">
        <div className="sidebar-temple-header">
          <div className="temple-lanterns"><span className="temple-lantern">🏮</span><span className="temple-title-text">土地公在線</span><span className="temple-lantern">🏮</span></div>
          <p className="temple-blessing">保佑出入平安 · 旅途順遂</p>
          <div className="temple-incense-row">{[0,1,2].map(i=><span key={i} className="temple-incense" style={{animationDelay:`${i*0.4}s`}}>🕯️</span>)}</div>
        </div>
        <div className="sidebar-section">
          <p className="sidebar-section-title">出席里長</p>
          <div className="agent-roster">
            {AGENTS.map(a=>(
              <div key={a.id} className="roster-item" style={{opacity:a.online?1:0.45}}>
                <div className="roster-avatar" style={{background:a.online?a.color:"var(--bg-elevated)"}}>
                  {a.name[0]}{a.online&&<span className="roster-online-dot"/>}
                </div>
                <div className="roster-info"><div className="roster-name">{a.name}</div><div className="roster-village">{a.village}</div></div>
                <span className="roster-badge">{a.badge}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Queue indicator */}
        {fortuneQueue.length > 1 && (
          <div className="fortune-queue-badge">
            🎋 還有 {fortuneQueue.length - 1} 張吉籤待彈出
          </div>
        )}
        <div className="sidebar-section" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <p className="sidebar-section-title">里長私房推薦吉籤</p>
          {savedSpots.length===0 ? (
            <div className="sidebar-empty-spots">
              <div style={{fontSize:"2rem",marginBottom:8}}>🎋</div>
              <p>里長推薦景點時</p><p>吉籤彈出全螢幕</p>
              <p style={{marginTop:6,color:"var(--gold)",fontSize:"0.78rem"}}>收下後出現在這裡</p>
            </div>
          ) : (
            <div className="live-props" style={{overflowY:"auto",flex:1}}>
              {savedSpots.map(s=>{
                const h=s.spot.id.split("").reduce((a,c)=>c.charCodeAt(0)+((a<<5)-a),0);
                const img=`/spots/spot${(Math.abs(h)%7)+1}.jpg`;
                return (
                  <div key={s.spot.id} className="prop-card saved-spot-card" onClick={()=>setExpandSpot(s)}>
                    <div className="saved-spot-badge" style={{background:s.agentColor}}>籤</div>
                    <img src={img} alt={s.spot.name} className="prop-img" onError={e=>{(e.target as HTMLImageElement).src="/spots/spot1.jpg"}}/>
                    <div className="prop-body">
                      <div className="prop-name">{s.spot.name}</div>
                      <div className="prop-tags"><span className="prop-tag">{s.agentName}</span></div>
                      <p className="saved-spot-hint">✦ 點擊展開吉籤</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
