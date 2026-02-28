import { useState, lazy, Suspense } from "react";
import Navbar from "./components/Navbar.jsx";
import QueryScreen from "./components/QueryScreen.jsx";
import ChatScreen from "./components/ChatScreen.jsx";
import "./index.css";

const MapPanel = lazy(() => import("./components/MapPanel.jsx"));

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

  return (
    <div className="h-screen flex bg-neutral-50">
      <Navbar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      <div className="w-[450px] flex-shrink-0 min-h-0 flex flex-col">
        {activeScreen === "query" && (
          <QueryScreen records={records} setRecords={setRecords} setSummaryData={setSummaryData} />
        )}
        {activeScreen === "chat" && (
          <ChatScreen setRecords={setRecords} setSummaryData={setSummaryData} />
        )}
      </div>
      <Suspense fallback={<div className="flex-1 min-w-0 bg-neutral-200" />}>
        <MapPanel records={records} summaryData={summaryData} />
      </Suspense>
    </div>
  );
}

export default App;
