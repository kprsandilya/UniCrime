import { useState, useEffect } from "react";
import { fetchSchools } from "../api/client";

export default function MapOverlay({ summaryData }) {
  const [codeToName, setCodeToName] = useState({});

  useEffect(() => {
    fetchSchools()
      .then((schools) => {
        const map = {};
        (schools || []).forEach((s) => {
          if (s.schoolCode) map[String(s.schoolCode).trim()] = s.schoolName || s.schoolCode;
        });
        setCodeToName(map);
      })
      .catch(() => {});
  }, []);

  if (!summaryData) {
    return (
      <div className="absolute top-6 right-6 z-[1000] w-80 rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-xl p-5">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Summary
        </div>
        <div className="text-sm text-neutral-600">
          Run a query or send a chat message to generate summary data.
        </div>
      </div>
    );
  }

  const {
    totalReports,
    reportsByDisposition,
    reportsBySchool,
    earliestOccurred,
    latestOccurred,
    lastUpdated,
  } = summaryData;

  const TOP_N = 10;
  const dispositionEntries = Object.entries(reportsByDisposition || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);
  const schoolEntries = Object.entries(reportsBySchool || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);

  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : "—";

  return (
    <div className="absolute top-6 right-6 z-[1000] w-80 rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-2xl p-6 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Summary
          </div>
          <div className="text-2xl font-semibold text-neutral-900">
            {totalReports}
          </div>
          <div className="text-xs text-neutral-500">
            Total Reports
          </div>
        </div>
        <div className="text-[11px] text-neutral-500 text-right">
          <div>Last Updated</div>
          <div className="font-medium text-neutral-700">
            {lastUpdatedStr}
          </div>
        </div>
      </div>

      {/* Disposition Section — top N by count */}
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          By Disposition
          {Object.keys(reportsByDisposition || {}).length > TOP_N && (
            <span className="normal-case font-normal text-neutral-400 ml-1">
              (top {TOP_N})
            </span>
          )}
        </div>

        {dispositionEntries.length === 0 ? (
          <div className="text-neutral-400 text-sm">—</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dispositionEntries.map(([k, v]) => (
              <span
                key={k}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium max-w-[20rem] break-words"
              >
                {k} • {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* School Section — top N by count */}
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          By School
          {Object.keys(reportsBySchool || {}).length > TOP_N && (
            <span className="normal-case font-normal text-neutral-400 ml-1">
              (top {TOP_N})
            </span>
          )}
        </div>

        {schoolEntries.length === 0 ? (
          <div className="text-neutral-400 text-sm">—</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {schoolEntries.map(([code, v]) => {
              const name = codeToName[code];
              return (
                <span
                  key={code}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium max-w-[20rem] break-words"
                >
                  {name ? `${name} (${code})` : `${code} • ${v}`}
                  {name ? ` • ${v}` : ""}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="border-t border-neutral-200 pt-4 space-y-2 text-xs text-neutral-600">
        <div className="flex justify-between">
          <span>Earliest Occurred</span>
          <span className="font-medium text-neutral-800">
            {earliestOccurred
              ? new Date(earliestOccurred).toLocaleString()
              : "—"}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Latest Occurred</span>
          <span className="font-medium text-neutral-800">
            {latestOccurred
              ? new Date(latestOccurred).toLocaleString()
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}