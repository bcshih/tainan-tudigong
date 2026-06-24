import { useAppStore } from "../../store/appStore";
import type { AppPage } from "../../types";

const NAV_ITEMS: { id:AppPage; char:string; name:string }[] = [
  { id:"home", char:"🏮", name:"首頁" },
  { id:"you",  char:"遊", name:"遊府城" },
  { id:"qian", char:"籤", name:"求吉籤" },
  { id:"wen",  char:"問", name:"問神明" },
  { id:"yuan", char:"願", name:"還心願" },
  { id:"yi",   char:"議", name:"廟口議" },
  { id:"fu",   char:"府", name:"府城報" },
];

export function NavBar() {
  const { page, setPage, resetChat, setPhase } = useAppStore();
  const handleNav = (id: AppPage) => {
    if (id === "you") { resetChat(); setPhase("form"); }
    setPage(id);
  };
  return (
    <nav className="navbar">
      {NAV_ITEMS.map(item => (
        <button key={item.id} type="button"
          className={`navbar-item ${page===item.id?"active":""}`}
          onClick={() => handleNav(item.id)}>
          <span className="navbar-char">{item.char}</span>
          <span className="navbar-name">{item.name}</span>
        </button>
      ))}
    </nav>
  );
}
