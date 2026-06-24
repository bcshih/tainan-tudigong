import { createRoot } from "react-dom/client";
import App from "./App";

// StrictMode 關閉 — 避免 WebSocket 被雙重建立
createRoot(document.getElementById("root")!).render(<App />);
