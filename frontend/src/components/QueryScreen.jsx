import { useState, useMemo } from "react";
import { fetchCrimeLogs } from "../api/client.js";
import { generateSummary } from "../data/mockData.js";

// Columns match crime-log.entity.ts: caseNumber, schoolCode, reportDatetime, occurredDatetime, location, description, disposition, narrative
const DISPLAY_COLUMNS = [
  "Number",
  "School_Code",
  "Reported_Date_Time",
  "Occurred_From_Date_Time",
  "Location",
  "Description",
  "Disposition",
  "Narrative",
];

const DATE_COLUMNS = new Set(["Reported_Date_Time", "Occurred_From_Date_Time"]);

/**
 * Interpret date (YYYY-MM-DD) in the user's local timezone, then return UTC ISO string
 * for start of that day (00:00:00 local → UTC).
 */
function localStartOfDayToUTC(dateOnlyStr) {
  if (!dateOnlyStr) return null;
  const [y, m, d] = dateOnlyStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  return isNaN(localStart.getTime()) ? null : localStart.toISOString();
}
/**
 * Interpret date (YYYY-MM-DD) in the user's local timezone, then return UTC ISO string
 * for end of that day (23:59:59.999 local → UTC).
 */
function localEndOfDayToUTC(dateOnlyStr) {
  if (!dateOnlyStr) return null;
  const [y, m, d] = dateOnlyStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
  return isNaN(localEnd.getTime()) ? null : localEnd.toISOString();
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function filterClientSide(data, filters) {
  const hasFilter = Object.values(filters).some((v) => v != null && String(v).trim() !== "");
  if (!hasFilter) return data;
  return data.filter((row) => {
    if (filters.schoolCode && !String(row.School_Code || "").toLowerCase().includes(filters.schoolCode.toLowerCase())) return false;
    if (filters.caseNumber && !String(row.Number || "").toLowerCase().includes(filters.caseNumber.toLowerCase())) return false;
    if (filters.location && !String(row.Location || "").toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.description && !String(row.Description || "").toLowerCase().includes(filters.description.toLowerCase())) return false;
    if (filters.disposition && !String(row.Disposition || "").toLowerCase().includes(filters.disposition.toLowerCase())) return false;
    if (filters.narrative && !String(row.Narrative || "").toLowerCase().includes(filters.narrative.toLowerCase())) return false;
    return true;
  });
}

export default function QueryScreen({ records, setRecords, setSummaryData }) {
  const [occurredAfter, setOccurredAfter] = useState("2026-02-01");
  const [occurredBefore, setOccurredBefore] = useState("2026-02-28");
  const [schoolCode, setSchoolCode] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [disposition, setDisposition] = useState("");
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const sortedRecords = useMemo(() => {
    const list = records ?? [];
    if (!sortKey) return list;
    const isDate = DATE_COLUMNS.has(sortKey);
    return [...list].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (isDate) {
        const aT = aVal ? new Date(aVal).getTime() : 0;
        const bT = bVal ? new Date(bVal).getTime() : 0;
        return sortDir === "asc" ? aT - bT : bT - aT;
      }
      const aStr = String(aVal ?? "").toLowerCase();
      const bStr = String(bVal ?? "").toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [records, sortKey, sortDir]);

  const handleSort = (col) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  const runQuery = async () => {
    setError(null);
    setLoading(true);
    const occurredAfterUTC = localStartOfDayToUTC(occurredAfter);
    const occurredBeforeUTC = localEndOfDayToUTC(occurredBefore);
    if (!occurredAfterUTC || !occurredBeforeUTC) {
      setError("Invalid date range.");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchCrimeLogs({
        occurredAfter: occurredAfterUTC,
        occurredBefore: occurredBeforeUTC,
      });
      const filtered = filterClientSide(data, {
        schoolCode: schoolCode.trim() || null,
        caseNumber: caseNumber.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
        disposition: disposition.trim() || null,
        narrative: narrative.trim() || null,
      });
      setRecords(filtered);
      setSummaryData(generateSummary(filtered));
    } catch (err) {
      setError(err.message ?? "Request failed.");
      setRecords([]);
      setSummaryData(generateSummary([]));
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { label: "Occurred from", value: occurredAfter, onChange: setOccurredAfter, type: "date" },
    { label: "Occurred to", value: occurredBefore, onChange: setOccurredBefore, type: "date" },
    { label: "School code", value: schoolCode, onChange: setSchoolCode, type: "text", placeholder: "Filter by school code" },
    { label: "Case number", value: caseNumber, onChange: setCaseNumber, type: "text", placeholder: "Filter by case number" },
    { label: "Location", value: location, onChange: setLocation, type: "text", placeholder: "Filter by location" },
    { label: "Description", value: description, onChange: setDescription, type: "text", placeholder: "Filter by description" },
    { label: "Disposition", value: disposition, onChange: setDisposition, type: "text", placeholder: "Filter by disposition" },
    { label: "Narrative", value: narrative, onChange: setNarrative, type: "text", placeholder: "Filter by narrative" },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">
      <div className="p-4 border-b border-neutral-200 space-y-3">
        <div className="text-sm font-semibold text-neutral-700">Filters</div>
        <div className="grid grid-cols-2 gap-2">
          {filters.map((f) => (
            <label key={f.label} className={f.type === "date" ? "" : "col-span-2"}>
              <span className="block text-xs text-neutral-500 mb-0.5">
                {f.label}
                {f.type === "date" ? " (local → UTC)" : ""}
              </span>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </label>
          ))}
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="button"
          onClick={runQuery}
          disabled={loading}
          className="w-full py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
        >
          {loading ? "Loading…" : "Run Query"}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="text-neutral-600 text-xs uppercase tracking-wide">
              {DISPLAY_COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-2 py-2 text-left font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-neutral-100 rounded"
                  onClick={() => handleSort(col)}
                >
                  {col.replaceAll("_", " ")}
                  {sortKey === col && (
                    <span className="ml-1 text-neutral-400" aria-hidden>
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((row) => (
              <tr key={row.id ?? row.Number} className="border-b border-neutral-100 hover:bg-neutral-50">
                {DISPLAY_COLUMNS.map((col) => (
                  <td key={col} className="px-2 py-2 text-neutral-800 max-w-[200px] truncate" title={row[col]}>
                    {DATE_COLUMNS.has(col) ? formatDate(row[col]) : (row[col] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {records?.length === 0 && !loading && (
          <div className="p-6 text-sm text-neutral-500 text-center">No results. Run a query or adjust filters.</div>
        )}
      </div>
    </div>
  );
}
