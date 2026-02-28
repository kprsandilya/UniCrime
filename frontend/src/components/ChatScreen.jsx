import { useState, useRef, useEffect } from "react";
import { fetchCrimeLogs } from "../api/client.js";
import { generateSummary } from "../data/mockData.js";

function filterByMessage(data, message) {
  const lower = message.toLowerCase().trim();
  if (!lower) return data.slice(0, 20);
  return data.filter((row) => {
    return (
      String(row.Location || "").toLowerCase().includes(lower) ||
      String(row.School_Code || "").toLowerCase().includes(lower) ||
      String(row.Number || "").toLowerCase().includes(lower) ||
      String(row.Description || "").toLowerCase().includes(lower) ||
      String(row.Disposition || "").toLowerCase().includes(lower) ||
      String(row.Narrative || "").toLowerCase().includes(lower)
    );
  });
}

export default function ChatScreen({ setRecords, setSummaryData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const data = await fetchCrimeLogs({
        occurredAfter: start.toISOString(),
        occurredBefore: now.toISOString(),
      });
      const filtered = filterByMessage(data, text);
      const result = filtered.length > 0 ? filtered : data.slice(0, 10);
      setRecords(result);
      setSummaryData(generateSummary(result));
      const reply = filtered.length > 0
        ? `Found ${filtered.length} record(s) matching "${text}". Results are on the map and in the summary.`
        : `No matches for "${text}". Showing ${result.length} recent record(s) instead.`;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setRecords([]);
      setSummaryData(generateSummary([]));
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">Send a message to search crime logs by location, school code, or case number (data from API).</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-800 border border-neutral-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-neutral-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Search by location, school code, description, disposition…"
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
          disabled={loading}
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-neutral-800 rounded-lg hover:bg-neutral-700 transition disabled:opacity-50"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
