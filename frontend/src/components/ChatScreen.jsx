import { useState, useRef, useEffect } from "react";
import { fetchNlpQuery } from "../api/client";
import { generateSummary } from "../data/mockData.js";

function formatCell(value) {
  if (value == null || value === "") return "—";
  const str = String(value);
  if (str.length > 80) return str.slice(0, 77) + "...";
  return str;
}

export default function ChatScreen({ setRecords, setSummaryData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nlpTableData, setNlpTableData] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setNlpTableData([]);
    try {
      const result = await fetchNlpQuery(text);
      setRecords(result);
      setSummaryData(generateSummary(result));
      setNlpTableData(result);
      const withLocations = result.filter((r) => r.latitude != null && r.longitude != null).length;
      const reply =
        result.length === 0
          ? `No crime log results for "${text}".`
          : `Found ${result.length} record(s).${withLocations > 0 ? ` ${withLocations} with locations are on the map.` : ""}`;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setRecords([]);
      setSummaryData(generateSummary([]));
      setNlpTableData([]);
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: "Number", label: "Case #" },
    { key: "Reported_Date_Time", label: "Reported" },
    { key: "Occurred_From_Date_Time", label: "Occurred" },
    { key: "Location", label: "Location" },
    { key: "Description", label: "Description" },
    { key: "Disposition", label: "Disposition" },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            Ask a question in natural language. The app will run a GraphQL query and show results in the table and on the map (when locations exist).
          </p>
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
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-neutral-100 text-neutral-800 border border-neutral-200">
              <span className="inline-flex gap-0.5 items-center min-h-[1.25rem]">
                <span className="chat-dot" />
                <span className="chat-dot chat-dot-2" />
                <span className="chat-dot chat-dot-3" />
              </span>
            </div>
          </div>
        )}
        {nlpTableData.length > 0 && (
          <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden">
            <div className="text-xs font-medium text-neutral-600 bg-neutral-100 px-3 py-2 border-b border-neutral-200">
              Results ({nlpTableData.length})
            </div>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    {columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 font-medium text-neutral-700 whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nlpTableData.map((row, idx) => (
                    <tr key={row.id ?? idx} className="border-b border-neutral-100 hover:bg-neutral-50">
                      {columns.map((c) => (
                        <td key={c.key} className="px-3 py-2 text-neutral-800 max-w-[200px] truncate" title={String(row[c.key] ?? "")}>
                          {formatCell(row[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-neutral-200 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. thefts at Purdue in the last 7 days"
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
