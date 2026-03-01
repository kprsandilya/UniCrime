import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import Navbar from "./components/Navbar.jsx";
import QueryScreen from "./components/QueryScreen.jsx";
import ChatScreen from "./components/ChatScreen.jsx";
import "./index.css";

const MapPanel = lazy(() => import("./components/MapPanel.jsx"));

const NAVBAR_WIDTH = 80;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 900;
const DEFAULT_PANEL_WIDTH = 450;

function App() {
  const [activeScreen, setActiveScreen] = useState("query");
  const [records, setRecords] = useState([]);
  const [summaryData, setSummaryData] = useState<{
    totalReports: number;
    reportsByDisposition: Record<string, number>;
    reportsBySchool: Record<string, number>;
    earliestOccurred: string;
    latestOccurred: string;
    lastUpdated: string;
  } | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    document.body.classList.add("select-none");
    document.body.style.cursor = "col-resize";
    const move = (e: MouseEvent) => {
      const x = e.clientX - NAVBAR_WIDTH;
      const w = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, x));
      setPanelWidth(w);
    };
    const up = () => {
      setIsDragging(false);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  return (
    <div className="h-screen flex bg-neutral-50">
      <Navbar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      <div
        className="flex-shrink-0 min-h-0 flex flex-col relative"
        style={{ width: panelWidth }}
      >
        <div
          className={`flex flex-col h-full min-h-0 ${activeScreen !== "query" ? "hidden" : ""}`}
          aria-hidden={activeScreen !== "query"}
        >
          <QueryScreen records={records} setRecords={setRecords} setSummaryData={setSummaryData} />
        </div>
        <div
          className={`flex flex-col h-full min-h-0 ${activeScreen !== "chat" ? "hidden" : ""}`}
          aria-hidden={activeScreen !== "chat"}
        >
          <ChatScreen setRecords={setRecords} setSummaryData={setSummaryData} />
        </div>
        <div
          role="separator"
          aria-label="Resize panel"
          onMouseDown={handleMouseDown}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize touch-none z-10 flex items-center justify-center group hover:bg-blue-500/20 transition-colors ${isDragging ? "bg-blue-500/30" : ""}`}
        >
          <span className="w-0.5 h-8 rounded-full bg-neutral-300 group-hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </div>
      <Suspense fallback={<div className="flex-1 min-w-0 bg-neutral-200" />}>
        <MapPanel records={records} summaryData={summaryData} />
      </Suspense>
    </div>
  );
}

export default App;
