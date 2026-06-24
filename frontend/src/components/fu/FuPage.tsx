import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4eHh4eHh4eHh4eHh4eHh4eHh4eHh4In0.dummy") as string;

interface Report { id:string; category:string; urgency:"low"|"mid"|"high"; content:string; lat:number; lng:number; time:string; aiSummary:string; }

const URGENCY_COLORS = {low:"#f5ae85",mid:"#cf447a",high:"#ff4444"};
const URGENCY_LABELS = {low:"⏳ 稍後",mid:"⚠️ 待處理",high:"🚨 緊急"};

const BASE = import.meta.env.VITE_BACKEND_HTTP ?? "http://127.0.0.1:8080";

export function FuPage() {
  const [selected, setSelected] = useState<string|null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<{ total: number; by_category: Record<string, number> } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mbRef = useRef<mapboxgl.Map|null>(null);

  // 從後端 API 抓取資料
  useEffect(() => {
    fetch(`${BASE}/dashboard/summary`)
      .then(r => r.json())
      .then(data => {
        setSummary({ total: data.total, by_category: data.by_category });
        setReports((data.recent ?? []).map((w: any) => ({
          id: w.wish_id,
          category: w.category ?? "其他",
          urgency: w.sentiment === "急迫" ? "high" : w.sentiment === "一般" ? "mid" : "low",
          content: w.raw_text,
          lat: w.location?.lat ?? 22.9998,
          lng: w.location?.lng ?? 120.2012,
          time: new Date(w.created_at).toLocaleString("zh-TW"),
          aiSummary: w.summary ?? w.raw_text,
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || mbRef.current) return;
    const map = new mapboxgl.Map({container:mapRef.current,style:"mapbox://styles/mapbox/dark-v11",center:[120.2012,22.9998],zoom:11,attributionControl:false});
    mbRef.current = map;
    map.on("load", () => {
      reports.forEach((r,i) => {
        const col = URGENCY_COLORS[r.urgency];
        const el = document.createElement("div");
        el.className = "gov-map-pin";
        el.style.background = col;
        el.style.boxShadow = `0 0 12px ${col}`;
        el.innerHTML = `<span>${i+1}</span>`;
        el.onclick = () => setSelected(s => s===r.id?null:r.id);
        new mapboxgl.Marker({element:el}).setLngLat([r.lng,r.lat]).addTo(map);
      });
    });
    return () => { map.remove(); mbRef.current = null; };
  }, [reports]);

  useEffect(() => {
    if (!mbRef.current || !selected) return;
    const r = reports.find(x=>x.id===selected);
    if (r) mbRef.current.flyTo({center:[r.lng,r.lat],zoom:15,duration:800});
  }, [selected]);

  const highCount = reports.filter(r => r.urgency === "high").length;
  const midCount = reports.filter(r => r.urgency === "mid").length;

  return (
    <div className="fu-page">
      <div className="fu-left">
        <div className="fu-header">
          <h1 className="fu-title">🏛️ 府城報</h1>
          <p className="fu-subtitle">台南市政府智慧治理看板</p>
        </div>
        <div className="fu-ai-card">
          <div className="gov-ai-badge">🤖 里長 AI 智慧導讀</div>
          <p className="gov-ai-text">
            本週共收到{" "}
            <strong style={{color:"var(--gold)"}}>{summary?.total ?? 0} 件</strong> 陳情，
            其中 <strong style={{color:"#ff4444"}}>{summary?.by_category?.["公共設施"] ?? highCount} 件公共設施</strong>、
            {summary?.by_category?.["交通"] ?? midCount} 件交通問題。
          </p>
        </div>
        <div className="fu-stats">
          {[
            {label:"總案件",val:String(summary?.total ?? reports.length),color:"var(--gold)"},
            {label:"緊急",val:String(highCount),color:"#ff4444"},
            {label:"待處理",val:String(midCount),color:"var(--rose)"},
            {label:"已收錄",val:String(reports.length),color:"#52b788"},
          ].map(s=>(
            <div key={s.label} className="fu-stat-card">
              <div className="fu-stat-val" style={{color:s.color}}>{s.val}</div>
              <div className="fu-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="report-list" style={{flex:1,overflowY:"auto"}}>
          {reports.length === 0 && (
            <div style={{color:"var(--text-secondary)",textAlign:"center",padding:"2rem 0",opacity:0.6}}>
              尚無陳情資料，或後端服務未啟動
            </div>
          )}
          {reports.map((r,i) => (
            <div key={r.id} className={`report-card ${selected===r.id?"selected":""}`} onClick={()=>setSelected(s=>s===r.id?null:r.id)}>
              <div className="report-card-top">
                <span className="report-cat">{r.category}</span>
                <span className="report-urgency" style={{color:URGENCY_COLORS[r.urgency],background:`${URGENCY_COLORS[r.urgency]}18`,border:`1px solid ${URGENCY_COLORS[r.urgency]}40`}}>{URGENCY_LABELS[r.urgency]}</span>
                <span className="report-time">{r.time}</span>
              </div>
              <p className="report-ai-summary">{r.aiSummary}</p>
              {selected===r.id && <p className="report-content">「{r.content}」</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="fu-map" ref={mapRef}/>
    </div>
  );
}
