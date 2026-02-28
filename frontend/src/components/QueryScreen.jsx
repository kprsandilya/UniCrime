import { useState, useMemo, useEffect } from "react";
import { fetchCrimeLogs, fetchSchools } from "../api/client.js";
import { generateSummary } from "../data/mockData.js";

// Table shows: Description first, then School (name when All), Occurred, Location, Narrative. Number, Reported_Date_Time, Disposition are only in case popup.
const DATE_COLUMNS = new Set(["Occurred_From_Date_Time"]);
const CASE_POPUP_FIELDS = [
  { key: "Number", label: "Case Number" },
  { key: "Reported_Date_Time", label: "Reported Date/Time" },
  { key: "Occurred_From_Date_Time", label: "Occurred Date/Time" },
  { key: "Location", label: "Location" },
  { key: "Description", label: "Description" },
  { key: "Disposition", label: "Disposition" },
  { key: "School_Code", label: "School" },
  { key: "Narrative", label: "Narrative" },
];

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
  const [selectedSchoolCode, setSelectedSchoolCode] = useState("");
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [disposition, setDisposition] = useState("");
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [popupRow, setPopupRow] = useState(null);
  // School column visibility is based on what was selected when the query was last run
  const [schoolCodeAtLastQuery, setSchoolCodeAtLastQuery] = useState("");

  // Table columns: include School only when last query was "All schools"
  const displayColumns = useMemo(() => {
    const base = ["Description", "Occurred_From_Date_Time", "Location", "Narrative"];
    if (!schoolCodeAtLastQuery.trim()) base.splice(1, 0, "School_Code");
    return base;
  }, [schoolCodeAtLastQuery]);

  // Code -> name for school column and popup (from dropdown options)
  const codeToName = useMemo(
    () => Object.fromEntries(schoolOptions.map((o) => [o.code, o.name || o.code])),
    [schoolOptions]
  );

  // Build dropdown: only schools that appear in crime log data (fetch with current date range)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const after = localStartOfDayToUTC(occurredAfter);
        const before = localEndOfDayToUTC(occurredBefore);
        if (!after || !before) return;
        const [logs, schools] = await Promise.all([
          fetchCrimeLogs({ occurredAfter: after, occurredBefore: before }),
          fetchSchools(),
        ]);
        if (cancelled) return;
        const codesInData = new Set((logs || []).map((r) => (r.School_Code || "").trim()).filter(Boolean));
        const options = (schools || [])
          .filter((s) => s.schoolCode && codesInData.has(String(s.schoolCode).trim()))
          .map((s) => ({ code: String(s.schoolCode).trim(), name: s.schoolName || s.schoolCode }));
        options.sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
        setSchoolOptions(options);
      } catch (e) {
        if (!cancelled) setSchoolOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [occurredAfter, occurredBefore]);

  const sortedRecords = useMemo(() => {
    const list = records ?? [];
    if (!sortKey || !displayColumns.includes(sortKey)) return list;
    const isDate = DATE_COLUMNS.has(sortKey);
    return [...list].sort((a, b) => {
      const aVal = sortKey === "School_Code" ? codeToName[a[sortKey]] || a[sortKey] : a[sortKey];
      const bVal = sortKey === "School_Code" ? codeToName[b[sortKey]] || b[sortKey] : b[sortKey];
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
  }, [records, sortKey, sortDir, displayColumns, codeToName]);

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
        schoolCode: selectedSchoolCode.trim() || null,
      });
      const filtered = filterClientSide(data, {
        caseNumber: caseNumber.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
        disposition: disposition.trim() || null,
        narrative: narrative.trim() || null,
      });
      setRecords(filtered);
      setSummaryData(generateSummary(filtered));
      setSchoolCodeAtLastQuery(selectedSchoolCode.trim());
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
          <label className="col-span-2">
            <span className="block text-xs text-neutral-500 mb-0.5">School</span>
            <select
              value={selectedSchoolCode}
              onChange={(e) => setSelectedSchoolCode(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white"
            >
              <option value="">All schools</option>
              {schoolOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name || opt.code}
                </option>
              ))}
            </select>
          </label>
          {filters.map((f) => (
            <label key={f.label} className={f.type === "date" ? "" : "col-span-2"}>
              <span className="block text-xs text-neutral-500 mb-0.5">
                {f.label}
                {f.type === "date"}
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
        <table className="w-full text-sm border-collapse min-w-[500px]">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="text-neutral-600 text-xs uppercase tracking-wide">
              {displayColumns.map((col) => (
                <th
                  key={col}
                  className="px-2 py-2 text-left font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-neutral-100 rounded"
                  onClick={() => handleSort(col)}
                >
                  {col === "School_Code" ? "School" : col === "Occurred_From_Date_Time" ? "Occurred Time" : col.replaceAll("_", " ")}
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
                {displayColumns.map((col) => {
                  const isDescription = col === "Description";
                  const displayValue =
                    col === "School_Code"
                      ? codeToName[row.School_Code] || row.School_Code || "—"
                      : DATE_COLUMNS.has(col)
                        ? formatDate(row[col])
                        : (row[col] ?? "—");
                  return (
                    <td
                      key={col}
                      className={`px-2 py-2 text-neutral-800 max-w-[200px] truncate ${isDescription ? "cursor-pointer underline decoration-dotted hover:bg-neutral-100" : ""}`}
                      title={isDescription ? "Click for full case details" : row[col]}
                      onClick={isDescription ? () => setPopupRow(row) : undefined}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {records?.length === 0 && !loading && (
          <div className="p-6 text-sm text-neutral-500 text-center">No results. Run a query or adjust filters.</div>
        )}
      </div>

      {popupRow && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPopupRow(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-neutral-800">Case details</h3>
              <button
                type="button"
                onClick={() => setPopupRow(null)}
                className="text-neutral-500 hover:text-neutral-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              {CASE_POPUP_FIELDS.map(({ key, label }) => {
                const value = key === "School_Code"
                  ? (codeToName[popupRow[key]] ? `${codeToName[popupRow[key]]} (${popupRow[key]})` : popupRow[key])
                  : DATE_COLUMNS.has(key) || key === "Reported_Date_Time"
                    ? formatDate(popupRow[key])
                    : popupRow[key];
                return (
                  <div key={key}>
                    <dt className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">{label}</dt>
                    <dd className="text-neutral-800 break-words">{value ?? "—"}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
