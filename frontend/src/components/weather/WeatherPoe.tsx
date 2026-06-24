import { useState, useEffect } from "react";

const WEATHER_API_KEY = (import.meta.env.VITE_WEATHER_KEY || "dummy_key") as string;
const TAINAN_LAT = 22.9999;
const TAINAN_LON = 120.2269;

interface WeatherData { temp: number; desc: string; icon: string; main: string; }
type PoeResult = "sheng" | "yin" | "xiao";

const POE_MAP: Record<string, PoeResult> = {
  Clear:"sheng", Clouds:"yin", Rain:"xiao", Drizzle:"xiao",
  Thunderstorm:"xiao", Snow:"yin", Mist:"yin", Fog:"yin", Haze:"yin",
};
const POE_INFO: Record<PoeResult, { name:string; emoji:string; msg:string; color:string; subMsg:string }> = {
  sheng: { name:"聖筊", emoji:"☀️", msg:"土地公保佑！出遊大吉！", color:"#FFD700", subMsg:"一正一反，神明允許，放心出發！" },
  yin:   { name:"陰筊", emoji:"⛅", msg:"天色陰沉，出門記得備傘，謹慎行事。", color:"#9c8ca6", subMsg:"兩個正面，神明猶豫，帶傘保險！" },
  xiao:  { name:"笑筊", emoji:"🌧️", msg:"土地公說今天最好待在屋裡！", color:"#f69d92", subMsg:"兩個反面，神明拒絕，建議改期！" },
};

function CupSVG({ flipped, style }: { flipped: boolean; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 70 100" width="80" height="110" style={style}>
      <defs>
        <radialGradient id="cupGrad" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#e05580"/>
          <stop offset="100%" stopColor="#6d1a38"/>
        </radialGradient>
      </defs>
      {!flipped ? (
        <>
          <ellipse cx="35" cy="22" rx="26" ry="10" fill="#6d1a38"/>
          <path d="M9 22 Q7 58 18 80 Q35 92 52 80 Q63 58 61 22 Z" fill="url(#cupGrad)"/>
          <ellipse cx="35" cy="22" rx="26" ry="9" fill="#8b244a"/>
          <ellipse cx="26" cy="38" rx="7" ry="14" fill="rgba(255,255,255,0.13)" transform="rotate(-12 26 38)"/>
          <ellipse cx="35" cy="80" rx="16" ry="6" fill="#6d1a38"/>
        </>
      ) : (
        <>
          <ellipse cx="35" cy="78" rx="26" ry="10" fill="#6d1a38"/>
          <path d="M9 78 Q7 42 18 20 Q35 8 52 20 Q63 42 61 78 Z" fill="url(#cupGrad)"/>
          <ellipse cx="35" cy="78" rx="26" ry="9" fill="#8b244a"/>
          <ellipse cx="26" cy="62" rx="7" ry="14" fill="rgba(255,255,255,0.13)" transform="rotate(12 26 62)"/>
          <ellipse cx="35" cy="20" rx="16" ry="6" fill="#6d1a38"/>
          <ellipse cx="35" cy="90" rx="22" ry="7" fill="rgba(255,215,0,0.35)"/>
        </>
      )}
    </svg>
  );
}

type Phase = "idle" | "ready" | "throwing" | "landing" | "result";

export function WeatherPoe({ onClose }: { onClose: () => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<PoeResult | null>(null);
  const [cup1Flipped, setCup1Flipped] = useState(false);
  const [cup2Flipped, setCup2Flipped] = useState(false);

  useEffect(() => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${TAINAN_LAT}&lon=${TAINAN_LON}&appid=${WEATHER_API_KEY}&units=metric&lang=zh_tw`)
      .then(r => r.json())
      .then(d => {
        if (d.weather) {
          setWeather({ temp: Math.round(d.main.temp), desc: d.weather[0].description, icon: d.weather[0].icon, main: d.weather[0].main });
        }
        setWeatherLoaded(true);
      })
      .catch(() => setWeatherLoaded(true));
  }, []);

  const handlePickUp = () => setPhase("ready");

  const handleThrow = () => {
    setPhase("throwing");
    // After throw animation, determine result
    setTimeout(() => {
      setPhase("landing");
      // Determine result from weather; if no weather, default sheng (sunny blessed)
      let res: PoeResult;
      if (weather) {
        res = POE_MAP[weather.main] ?? "yin";
      } else {
        res = "sheng"; // No weather data → assume blessed sunny
      }
      setResult(res);
      // Set cup positions based on result
      if (res === "sheng") { setCup1Flipped(false); setCup2Flipped(true); }
      else if (res === "yin") { setCup1Flipped(false); setCup2Flipped(false); }
      else { setCup1Flipped(true); setCup2Flipped(true); }
      setTimeout(() => setPhase("result"), 600);
    }, 1400);
  };

  const info = result ? POE_INFO[result] : null;

  return (
    <div className="weather-poe-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="weather-poe-modal">
        <button type="button" className="weather-poe-close" onClick={onClose}>✕</button>

        <div className="weather-poe-title">🪙 擲筊問天氣</div>
        <p className="weather-poe-sub">讓土地公告訴你今天出遊吉不吉利</p>

        {/* Show weather info only before throw (idle/ready state) so it appears AFTER divination */}
        {phase === "idle" && !weather && !weatherLoaded && (
          <div className="weather-no-data">正在連線天氣資料…</div>
        )}
        {phase === "idle" && !weather && weatherLoaded && (
          <div className="weather-no-data">⚠️ 天氣資料暫無，擲完筊再告訴你土地公怎麼說</div>
        )}

        {/* CUPS AREA */}
        <div className="weather-cups-area">

          {/* IDLE: cups resting, show pick-up button */}
          {phase === "idle" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
              <div style={{ display:"flex", gap:32 }}>
                <CupSVG flipped={false} style={{ animation:"cupBob 2s ease-in-out infinite" }}/>
                <CupSVG flipped={false} style={{ animation:"cupBob 2s ease-in-out infinite", animationDelay:"0.4s" }}/>
              </div>
              <button type="button" className="poe-pickup-btn" onClick={handlePickUp}>
                🙏 捧起筊杯
              </button>
            </div>
          )}

          {/* READY: cups raised in hands, throw button */}
          {phase === "ready" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
              <div style={{ display:"flex", gap:32, alignItems:"center" }}>
                <CupSVG flipped={false} style={{ transform:"translateY(-20px) rotate(-15deg)", filter:"drop-shadow(0 8px 16px rgba(207,68,122,0.5))" }}/>
                <span style={{ fontSize:"2rem" }}>🙏</span>
                <CupSVG flipped={false} style={{ transform:"translateY(-20px) rotate(15deg)", filter:"drop-shadow(0 8px 16px rgba(207,68,122,0.5))" }}/>
              </div>
              <p style={{ fontSize:"0.82rem", color:"var(--text-secondary)", letterSpacing:"0.06em" }}>土地公在上，弟子誠心叩問…</p>
              <button type="button" className="poe-throw-btn" onClick={handleThrow}>
                🎯 擲出！
              </button>
            </div>
          )}

          {/* THROWING */}
          {phase === "throwing" && (
            <div style={{ display:"flex", gap:32, justifyContent:"center", height:120, alignItems:"center" }}>
              <CupSVG flipped={false} style={{ animation:"cupThrowLeft 1.4s ease-out forwards" }}/>
              <CupSVG flipped={true}  style={{ animation:"cupThrowRight 1.4s ease-out forwards", animationDelay:"0.08s" }}/>
            </div>
          )}

          {/* LANDING */}
          {phase === "landing" && (
            <div style={{ display:"flex", gap:32, justifyContent:"center" }}>
              <CupSVG flipped={cup1Flipped} style={{ animation:"cupLand 0.35s ease both" }}/>
              <CupSVG flipped={cup2Flipped} style={{ animation:"cupLand 0.35s ease both", animationDelay:"0.12s" }}/>
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && info && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
              <div style={{ display:"flex", gap:28, justifyContent:"center", marginBottom:4 }}>
                <CupSVG flipped={cup1Flipped}/>
                <CupSVG flipped={cup2Flipped}/>
              </div>
              <div className="weather-poe-badge" style={{ color:info.color, borderColor:info.color, background:`${info.color}12` }}>
                {info.emoji} {info.name}
              </div>
              <p style={{ fontSize:"0.78rem", color:"var(--text-dim)", letterSpacing:"0.04em" }}>{info.subMsg}</p>
              <p className="weather-poe-msg" style={{ color:info.color }}>{info.msg}</p>
              {weather ? (
                <div className="weather-poe-detail">
                  <img src={`https://openweathermap.org/img/wn/${weather.icon}.png`} alt="" style={{width:28,verticalAlign:"middle"}}/>
                  今日台南 {weather.temp}°C · {weather.desc}
                </div>
              ) : (
                <div className="weather-poe-detail" style={{color:"var(--gold)"}}>
                  天氣資料暫無，但土地公擲出{result === "sheng" ? "聖筊" : result === "yin" ? "陰筊" : "笑筊"}，看來{result === "sheng" ? "有保佑！☀️" : result === "yin" ? "需謹慎出行！⛅" : "建議改期！🌧️"}
                </div>
              )}
            </div>
          )}
        </div>

        {phase === "result" && (
          <button type="button" className="weather-done-btn" onClick={onClose}>
            🙏 感謝土地公指引
          </button>
        )}
      </div>
    </div>
  );
}
