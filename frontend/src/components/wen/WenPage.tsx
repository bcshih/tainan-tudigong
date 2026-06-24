import { useState, useEffect } from "react";

const WEATHER_KEY = (import.meta.env.VITE_WEATHER_KEY || "dummy_key") as string;
type GodId = "tudigong"|"yuelao"|"mazu"|"caishen"|"guandi"|"guanyin";
type PoeResult = "sheng"|"yin"|"xiao";

const GODS = [
  { id:"tudigong" as GodId, name:"土地公", title:"福德正神", img:"/gods/tudigong.png", desc:"出行運勢・今日吉凶", color:"#D4A017", question:"今日出遊適不適合？" },
  { id:"yuelao"   as GodId, name:"月老",   title:"月老星君", img:"/gods/yuelao.png",   desc:"姻緣・感情・桃花", color:"#ffb6c1", question:"感情姻緣如何？" },
  { id:"mazu"     as GodId, name:"媽祖",   title:"天上聖母", img:"/gods/mazu.png",     desc:"平安・出行・保佑", color:"#4a90d9", question:"此行是否平安？" },
  { id:"caishen"  as GodId, name:"財神爺", title:"武財神",   img:"/gods/caishen.png",  desc:"財運・投資・求財", color:"#FFD700", question:"近期財運如何？" },
  { id:"guandi"   as GodId, name:"關聖帝君",title:"協天大帝",img:"/gods/guandi.png",  desc:"事業・義氣・官司", color:"#2E7D32", question:"事業運勢如何？" },
  { id:"guanyin"  as GodId, name:"文昌帝君",title:"文昌星君",img:"/gods/guanyin.png", desc:"學業・考試・求職", color:"#8a2be2", question:"考試學業如何？" },
];

const POE_RESULTS: Record<GodId, Record<PoeResult,{title:string;msg:string;sub:string}>> = {
  tudigong:{ sheng:{title:"聖筊・出行大吉",msg:"土地公保佑！今日好天氣，出遊大吉！",sub:"一正一反，神明允許！"}, yin:{title:"陰筊・謹慎出行",msg:"天色陰沉，記得備傘，謹慎出行。",sub:"兩個正面，帶傘保險！"}, xiao:{title:"笑筊・建議留家",msg:"土地公說今天最好待在屋裡！",sub:"兩個反面，建議改期！"} },
  yuelao:  { sheng:{title:"聖筊・桃花大旺",msg:"月老祝福！近期桃花旺盛，緣分將至！",sub:"一正一反，月老應允！"}, yin:{title:"陰筊・緣分待機",msg:"緣分還需等待，放平心態，機緣自來。",sub:"兩個正面，耐心等待！"}, xiao:{title:"笑筊・感情需努力",msg:"月老提醒：感情需要主動付出與耐心。",sub:"兩個反面，多多用心！"} },
  mazu:    { sheng:{title:"聖筊・出行平安",msg:"媽祖娘娘保佑！此行平安順遂，萬事大吉！",sub:"一正一反，媽祖允諾！"}, yin:{title:"陰筊・注意安全",msg:"出行需謹慎，多注意安全，媽祖守護你。",sub:"兩個正面，小心慢行！"}, xiao:{title:"笑筊・暫緩出行",msg:"媽祖說此時不宜遠行，建議擇日再出發。",sub:"兩個反面，暫緩行程！"} },
  caishen: { sheng:{title:"聖筊・財運亨通",msg:"財神爺賜福！近期財運旺盛，積極把握！",sub:"一正一反，財神應允！"}, yin:{title:"陰筊・守財為上",msg:"財運平平，守成為主，謹慎投資。",sub:"兩個正面，保守為宜！"}, xiao:{title:"笑筊・謹慎理財",msg:"財神提醒：近期不宜大額投資，守住現有！",sub:"兩個反面，謹慎保守！"} },
  guandi:  { sheng:{title:"聖筊・事業順遂",msg:"關聖帝君賜福！事業運旺，可積極開創！",sub:"一正一反，關公應允！"}, yin:{title:"陰筊・穩守待機",msg:"事業需穩紮穩打，暫緩擴張，蓄積能量。",sub:"兩個正面，穩守為主！"}, xiao:{title:"笑筊・暫緩行動",msg:"關聖帝君說此時不宜輕舉妄動，等待時機。",sub:"兩個反面，暫緩行動！"} },
  guanyin: { sheng:{title:"聖筊・金榜題名",msg:"文昌帝君保佑！此次考試必定金榜題名！",sub:"一正一反，文昌允諾！"}, yin:{title:"陰筊・繼續加油",msg:"還需加倍用功，文昌帝君看你努力程度。",sub:"兩個正面，繼續加油！"}, xiao:{title:"笑筊・調整方法",msg:"文昌帝君提醒：學習方法需要調整！",sub:"兩個反面，改變方法！"} },
};

const POE_COLOR: Record<PoeResult,string> = {sheng:"#FFD700",yin:"#9c8ca6",xiao:"#f69d92"};
const WEATHER_MAP: Record<string,PoeResult> = {Clear:"sheng",Clouds:"yin",Rain:"xiao",Drizzle:"xiao",Thunderstorm:"xiao",Snow:"yin",Mist:"yin",Fog:"yin",Haze:"yin"};

import { AnimatedJiubei } from "./../theater/Jiaobei";

export function WenPage() {
  const [activeGodId, setActiveGodId] = useState<GodId|null>(null);
  const [phase, setPhase] = useState<"idle"|"ready"|"throwing"|"result">("idle");
  const [result, setResult] = useState<PoeResult|null>(null);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [weather, setWeather] = useState<{temp:number;desc:string;main:string}|null>(null);
  const [aiReading, setAiReading] = useState<{ title: string; msg: string; sub: string } | null>(null);

  const BASE = import.meta.env.VITE_BACKEND_HTTP ?? "http://127.0.0.1:8080";

  useEffect(() => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=22.9999&lon=120.2269&appid=${WEATHER_KEY}&units=metric&lang=zh_tw`)
      .then(r=>r.json()).then(d=>{if(d.weather)setWeather({temp:Math.round(d.main.temp),desc:d.weather[0].description,main:d.weather[0].main});}).catch(()=>{});
  },[]);

  const selectGod = (id: GodId) => { setActiveGodId(id); setPhase("idle"); setResult(null); setC1(false); setC2(false); };

  const handleThrow = () => {
    if (phase!=="ready") return;

    let res: PoeResult;
    if(activeGodId==="tudigong"&&weather) res=WEATHER_MAP[weather.main]??"yin";
    else{const opts:PoeResult[]=["sheng","yin","xiao"];res=opts[Math.floor(Math.random()*3)];}
    setResult(res);
    if(res==="sheng"){setC1(false);setC2(true);}
    else if(res==="yin"){setC1(false);setC2(false);}
    else{setC1(true);setC2(true);}

    setPhase("throwing");
    setScreenShake(true); setTimeout(()=>setScreenShake(false),600);

    const weatherStr = weather ? `${weather.desc} ${weather.temp}°C` : undefined;
    fetch(`${BASE}/divination`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        god_id: activeGodId,
        question: activeGod?.question ?? "請賜指引",
        poe_result: res,
        weather: weatherStr,
      }),
    }).then(r => r.json())
      .then(data => setAiReading(data))
      .catch(() => setAiReading(null));

    setTimeout(() => {
      setPhase("result");
    }, 1200);
  };

  const reset = () => { setPhase("idle"); setResult(null); setActiveGodId(null); setC1(false); setC2(false); setAiReading(null); };
  const tryAgain = () => { setPhase("idle"); setResult(null); setC1(false); setC2(false); setAiReading(null); };
  const activeGod = GODS.find(g => g.id === activeGodId);
  const info = aiReading ?? (result && activeGodId ? POE_RESULTS[activeGodId][result] : null);

  return (
    <div className={`wen-fullpage ${screenShake?"wen-screen-shake":""}`}>

      {/* ── TOP 70%: god stage ── */}
      <div className="wen-stage">
        {!activeGodId ? (
          <div className="wen-stage-empty">
            <div className="wen-stage-lanterns">🏮🏮🏮</div>
            <h2 className="wen-stage-prompt">選擇神明，誠心擲筊</h2>
            <p className="wen-stage-sub">↓ 下方點選神明 ↓</p>
          </div>
        ) : (
          <>
            {/* God image — with padding-top so crown never clips */}
            <div style={{paddingTop:20,display:"flex",justifyContent:"center"}}>
              <div className="god-image-container wen-god-big">
                <div className="golden-backlight"/>
                <img key={activeGodId} src={activeGod?.img} alt={activeGod?.name} className={`active-${activeGodId}`}/>
              </div>
            </div>

            {/* God name — compact */}
            {phase!=="result" && (
              <div className="wen-god-nameblock god-info-text-block">
                <h2 className="wen-god-name-title" style={{color:activeGod?.color}}>{activeGod?.name}</h2>
                <p className="wen-god-name-sub">{activeGod?.title} · {activeGod?.question}</p>
                {activeGodId==="tudigong"&&weather&&<div className="wen-weather-chip">☁️ 台南 {weather.temp}°C · {weather.desc}</div>}
              </div>
            )}

            {/* ── CUPS + BUTTONS — independent block, never absolute ── */}
            <div className="wen-poe-block">
              <AnimatedJiubei phase={phase} c1={c1} c2={c2} />

              {phase==="idle"  && <button type="button" className="wen-big-btn" onClick={()=>setPhase("ready")}>🙏 捧起筊杯</button>}
              {phase==="ready" && (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <p className="wen-pray-big">誠心叩問{activeGod?.name}，心中默念問題…</p>
                  <button type="button" className="wen-big-btn wen-throw-btn" style={{background:`linear-gradient(135deg,${activeGod?.color}88,${activeGod?.color})`}} onClick={handleThrow}>🎯 擲出！</button>
                </div>
              )}
              {phase!=="result" && <button type="button" className="wen-back-small" onClick={reset}>← 換神明</button>}
            </div>

            {/* Result panel */}
            {phase==="result" && info && result && (
              <div className="wen-result-panel">
                <div className="wen-result-badge-big" style={{color:POE_COLOR[result],borderColor:POE_COLOR[result]}}>{info.title}</div>
                <p className="wen-result-sub-big">{info.sub}</p>
                <p className="wen-result-msg-big" style={{color:POE_COLOR[result]}}>{info.msg}</p>
                <div className="wen-result-btns">
                  <button type="button" className="weather-done-btn" onClick={reset}>感謝{activeGod?.name}指引 🙏</button>
                  <button type="button" className="wen-back-small" onClick={tryAgain}>再問一次</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BOTTOM 20%: god selector bar — pinned to bottom ── */}
      <div className="wen-god-selector-bar">
        {GODS.map(g => (
          <button key={g.id} type="button"
            className={`wen-god-selector-card ${activeGodId===g.id?"active":""}`}
            style={activeGodId===g.id?{borderColor:g.color,boxShadow:`0 0 16px ${g.color}40`,background:`${g.color}14`}:{}}
            onClick={() => selectGod(g.id)}>
            <div className="wen-sel-name" style={{color:activeGodId===g.id?g.color:undefined}}>{g.name}</div>
            <div className="wen-sel-title">{g.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
