import { useAppStore } from "../../store/appStore";
import type { AppPage } from "../../types";

const PAGES: { id:AppPage; char:string; name:string; desc:string; color:string }[] = [
  { id:"you",  char:"遊", name:"遊府城", desc:"里長幫你排行程",     color:"#cf447a" },
  { id:"qian", char:"籤", name:"求吉籤", desc:"土地公決定你去哪",   color:"#FFD700" },
  { id:"wen",  char:"問", name:"問神明", desc:"擲筊問天氣姻緣考運", color:"#f5ae85" },
  { id:"yuan", char:"願", name:"還心願", desc:"上香通報城市問題",   color:"#9c8ca6" },
  { id:"yi",   char:"議", name:"廟口議", desc:"里長大會討論大事",   color:"#37516c" },
  { id:"fu",   char:"府", name:"府城報", desc:"市政府城市儀表板",   color:"#8b244a" },
];

export function HomePage() {
  const { setPage } = useAppStore();
  return (
    // 9. Strict 100vh lock — no outer scroll
    <div className="home-page" style={{height:"100vh",overflow:"hidden"}}>
      <div className="home-header">
        <div className="home-lanterns">
          {[0,1,2].map(i=><span key={i} className="home-lantern" style={{animationDelay:`${i*0.3}s`}}>🏮</span>)}
        </div>
        <h1 className="home-title">台南・土地公在線</h1>
        <p className="home-subtitle">府城智慧城市 · 神明與里長共同守護</p>
        <div className="home-divider"><span className="home-divider-gem">✦</span></div>
        <p className="home-blessing">土地公保佑出入平安 · 旅途順遂 · 萬事如意</p>
      </div>
      <div className="home-grid">
        {PAGES.map(p=>(
          <button key={p.id} type="button" className="home-card"
            style={{"--card-color":p.color} as React.CSSProperties}
            onClick={()=>setPage(p.id)}>
            <div className="home-card-char" style={{color:p.color}}>{p.char}</div>
            <div className="home-card-name">{p.name}</div>
            <div className="home-card-desc">{p.desc}</div>
            <div className="home-card-glow"/>
          </button>
        ))}
      </div>
      {/* 9. Complete footer with all 6 gods */}
      <div className="home-footer">
        <span style={{fontSize:"0.7rem",color:"var(--text-dim)",letterSpacing:"0.1em",textAlign:"center"}}>
          ⛩️ 土地公、月老、媽祖、財神爺、關聖帝君、文昌帝君 齊聚府城・護佑平安 ⛩️
        </span>
      </div>
    </div>
  );
}
