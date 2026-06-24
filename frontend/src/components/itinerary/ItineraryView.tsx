import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { ItineraryCard } from "./ItineraryCard";
import { MapView } from "./MapView";

// Mock data so the map has something to show
import type { DayItinerary } from "../../types";

const MOCK_ITINERARY: DayItinerary[] = [
  {
    date: "2025-10-01",
    items: [
      { id:"i1", date:"2025-10-01", order:1, transportFromPrev:"walk",
        spot:{ id:"s1", name:"赤崁樓", district:"中西區", village:"赤崁里", address:"台南市中西區民族路二段212號", openHours:"08:30–21:30", description:"荷蘭時期建造的歷史古蹟", rating:4.5, reviewCount:3200, walkMinutesFromPrev:0, tags:["🏯 古蹟","⭐ 必訪"], lat:22.9972, lng:120.2028 } },
      { id:"i2", date:"2025-10-01", order:2, transportFromPrev:"walk",
        spot:{ id:"s2", name:"神農街", district:"中西區", village:"神農里", address:"台南市中西區神農街", openHours:"全天開放", description:"充滿文青氛圍的老街", rating:4.3, reviewCount:2100, walkMinutesFromPrev:8, tags:["🌃 夜遊","🛍️ 文創"], lat:22.9940, lng:120.1950 } },
      { id:"i3", date:"2025-10-01", order:3, transportFromPrev:"scooter",
        spot:{ id:"s3", name:"安平古堡", district:"安平區", village:"古堡里", address:"台南市安平區國勝路82號", openHours:"08:30–17:30", description:"台灣最古老的城堡", rating:4.4, reviewCount:2800, walkMinutesFromPrev:0, tags:["🏰 古蹟","📸 必拍"], lat:22.9929, lng:120.1617 } },
      { id:"i4", date:"2025-10-01", order:4, transportFromPrev:"walk",
        spot:{ id:"s4", name:"安平樹屋", district:"安平區", village:"安平里", address:"台南市安平區古堡街108巷", openHours:"08:30–17:30", description:"百年老屋被榕樹包覆的奇景", rating:4.2, reviewCount:1900, walkMinutesFromPrev:5, tags:["🌿 自然","🏚️ 歷史"], lat:22.9893, lng:120.1607 } },
    ]
  },
  {
    date: "2025-10-02",
    items: [
      { id:"i5", date:"2025-10-02", order:1, transportFromPrev:"walk",
        spot:{ id:"s5", name:"奇美博物館", district:"仁德區", village:"中洲里", address:"台南市仁德區文華路二段66號", openHours:"09:30–17:30", description:"宏偉的歐式建築與豐富館藏", rating:4.7, reviewCount:5200, walkMinutesFromPrev:0, tags:["🎨 藝術","🏛️ 博物館"], lat:22.9876, lng:120.2345 } },
      { id:"i6", date:"2025-10-02", order:2, transportFromPrev:"bus",
        spot:{ id:"s6", name:"花園夜市", district:"北區", village:"花園里", address:"台南市北區海安路三段533號", openHours:"18:00–01:00", description:"台南最大的夜市", rating:4.1, reviewCount:4100, walkMinutesFromPrev:0, tags:["🍜 美食","🌙 夜市"], lat:23.0138, lng:120.2029 } },
    ]
  }
];

export function ItineraryView() {
  const { itinerary: storeItinerary, setPhase } = useAppStore();
  const [activeDay, setActiveDay] = useState(0);
  const [activeItemId, setActiveItemId] = useState<string | undefined>();

  const { wsStatus } = useAppStore();
  const useMock = storeItinerary.length === 0 && wsStatus !== "connected" && wsStatus !== "connecting";
  const itinerary = storeItinerary.length > 0 ? storeItinerary : (useMock ? MOCK_ITINERARY : []);

  if (itinerary.length === 0) {
    return (
      <div className="itinerary-view" style={{justifyContent:"center",alignItems:"center",display:"flex",flexDirection:"column"}}>
        <div className="map-loading-spinner" />
        <h2 style={{color:"white",marginTop:20,fontSize:"1.4rem",fontWeight:500,letterSpacing:"0.05em"}}>土地公與里長們正在為您編排最佳行程...</h2>
        <p style={{color:"var(--text-dim)",marginTop:10,letterSpacing:"0.02em"}}>請稍候，神明很快就會降下旨意 🏮</p>
      </div>
    );
  }

  const currentDay = itinerary[activeDay];

  return (
    <div className="itinerary-view">
      <aside className="itinerary-sidebar">
        <div className="sidebar-header">
          <button type="button" className="back-btn" onClick={() => setPhase("chat")}>← 回聊天室調整</button>
          <h2 className="sidebar-title">你的台南行程</h2>
          <p className="sidebar-title-sub">由里長們精心策劃 · 可自由調整</p>
        </div>

        <nav className="day-tabs">
          {itinerary.map((day, i) => (
            <button key={day.date} type="button"
              className={`day-tab ${i === activeDay ? "active" : ""}`}
              onClick={() => setActiveDay(i)}>
              Day {i + 1}
              <span className="day-date">{day.date}</span>
            </button>
          ))}
        </nav>

        <div className="cards-list">
          {currentDay?.items.map((item, i) => (
            <div key={item.id} onMouseEnter={() => setActiveItemId(item.id)} onMouseLeave={() => setActiveItemId(undefined)}>
              <ItineraryCard item={item} isFirst={i === 0} />
            </div>
          ))}
          {(!currentDay || currentDay.items.length === 0) && (
            <div className="empty-day">
              <p>這天還沒有行程</p>
              <p>回聊天室跟里長們商量？</p>
            </div>
          )}
        </div>

        <button type="button" className="export-btn">匯出行程 ↗</button>
      </aside>

      <main className="map-area">
        <MapView itinerary={currentDay} activeItemId={activeItemId} />
      </main>
    </div>
  );
}
