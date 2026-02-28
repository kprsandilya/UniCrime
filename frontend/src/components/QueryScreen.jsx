import { useState } from "react";
import { mockData, generateSummary } from "../data/mockData";

const DISPLAY_COLUMNS = [
  "Number",
  "Disposition",
  "School_Code",
  "Location",
  "Occurred_From_Date_Time",
];

function filterData(data, filters) {
  const filtered = data.filter((row) => {
    if (filters.description && !row.Description.toLowerCase().includes(filters.description.toLowerCase())) return false;
    if (filters.disposition && !row.Disposition.toLowerCase().includes(filters.disposition.toLowerCase())) return false;
    if (filters.schoolCode && !row.School_Code.toLowerCase().includes(filters.schoolCode.toLowerCase())) return false;
    if (filters.location && !row.Location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    return true;
  });

  if (filtered.length === 0) {
    return data.slice(0, 3);
  }
  return filtered;
}

export default function QueryScreen({ records, setRecords, setSummaryData }) {
  const [description, setDescription] = useState("");
  const [disposition, setDisposition] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [location, setLocation] = useState("");

  const runQuery = () => {
    const filtered = filterData(mockData, {
      description: description.trim() || null,
      disposition: disposition.trim() || null,
      schoolCode: schoolCode.trim() || null,
      location: location.trim() || null,
    });

    setRecords(filtered);
    setSummaryData(generateSummary(filtered));
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">

      {/* Filter Section */}
      <div className="p-5 border-b border-neutral-200 space-y-4">
        <div className="text-sm font-semibold text-neutral-700">Filters</div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="col-span-2 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <input
            type="text"
            placeholder="Disposition"
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <input
            type="text"
            placeholder="School Code"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="col-span-2 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />
        </div>

        <button
          type="button"
          onClick={runQuery}
          className="w-full py-2.5 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition"
        >
          Run Query
        </button>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="text-neutral-600 text-xs uppercase tracking-wide">
              {DISPLAY_COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 text-left font-semibold"
                >
                  {col.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(records || []).map((row) => (
              <tr
                key={row.Number}
                className="border-b border-neutral-100 hover:bg-neutral-50 transition"
              >
                {DISPLAY_COLUMNS.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-3 text-neutral-800 truncate"
                    title={row[col]}
                  >
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {records?.length === 0 && (
          <div className="p-6 text-sm text-neutral-500 text-center">
            No results found.
          </div>
        )}
      </div>
    </div>
  );
}