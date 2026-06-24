import { useAppStore } from "./store/appStore";
import { NavBar } from "./components/nav/NavBar";
import { HomePage } from "./components/home/HomePage";
import { PreferenceForm } from "./components/form/PreferenceForm";
import { ChatRoom } from "./components/chat/ChatRoom";
import { ItineraryView } from "./components/itinerary/ItineraryView";
import { QianPage } from "./components/qian/QianPage";
import { WenPage } from "./components/wen/WenPage";
import { WishPage } from "./components/wish/WishPage";
import { FuPage } from "./components/fu/FuPage";
import { YiPage } from "./components/yi/YiPage";
import "./styles/global.css";

import { useRealAgentWS } from "./hooks/useWebSocket";

function YouSection() {
  const { phase, realIntent } = useAppStore();

  useRealAgentWS(
    realIntent?.text ?? "",
    realIntent?.lat ?? 22.9999,
    realIntent?.lng ?? 120.2269,
    !!realIntent && (phase === "chat" || phase === "itinerary")
  );

  if (phase==="form")      return <PreferenceForm/>;
  if (phase==="chat")      return <ChatRoom/>;
  if (phase==="itinerary") return <ItineraryView/>;
  return <PreferenceForm/>;
}

export default function App() {
  const { page } = useAppStore();
  const showNav = page !== "home";

  return (
    <div className="app-root">
      {page==="home" ? (
        <HomePage/>
      ) : (
        <>
          <div className="app-content">
            {page==="you"  && <YouSection/>}
            {page==="qian" && <QianPage/>}
            {page==="wen"  && <WenPage/>}
            {page==="yuan" && <WishPage/>}
            {page==="yi"   && <YiPage/>}
            {page==="fu"   && <FuPage/>}
          </div>
          <NavBar/>
        </>
      )}
    </div>
  );
}
