import { useState, useRef, useEffect } from "react";
import { mockData, generateSummary } from "../data/mockData";

function simulateResponse(message) {
  const lower = message.toLowerCase();
  const filtered = mockData.filter((row) => {
    return (
      row.Description.toLowerCase().includes(lower) ||
      row.Location.toLowerCase().includes(lower) ||
      row.Disposition.toLowerCase().includes(lower) ||
      row.School_Code.toLowerCase().includes(lower)
    );
  });
  return filtered.length > 0 ? filtered : mockData.slice(0, 3);
}

export default function ChatScreen({ setRecords, setSummaryData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    const filtered = simulateResponse(text);
    setRecords(filtered);
    setSummaryData(generateSummary(filtered));
    const reply = `Found ${filtered.length} record(s) matching your query. Results are shown on the map and in the summary.`;
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">Send a message to search records (e.g. theft, library, closed).</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
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
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent"
        />
        <button
          type="button"
          onClick={send}
          className="px-4 py-2 text-sm font-medium text-white bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
