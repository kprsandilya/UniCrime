export default function MapOverlay({ summaryData }) {
  if (!summaryData) {
    return (
      <div className="absolute top-4 right-4 z-[1000] w-72 rounded-xl border border-neutral-200 bg-white/90 shadow-lg backdrop-blur-sm p-4">
        <p className="text-sm text-neutral-500">No summary data. Run a query or send a chat message.</p>
      </div>
    );
  }
  const { totalReports, reportsByDisposition, reportsBySchool, earliestOccurred, latestOccurred, lastUpdated } = summaryData;
  const lastUpdatedStr = lastUpdated ? new Date(lastUpdated).toLocaleString() : "—";
  return (
    <div className="absolute top-4 right-4 z-[1000] w-72 rounded-xl border border-neutral-200 bg-white/90 shadow-lg backdrop-blur-sm p-4 text-sm">
      <h3 className="font-semibold text-neutral-800 mb-3">Summary</h3>
      <dl className="space-y-2 text-neutral-700">
        <div>
          <dt className="font-medium text-neutral-600">Total Reports</dt>
          <dd>{totalReports}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">By Disposition</dt>
          <dd className="mt-0.5">
            {Object.keys(reportsByDisposition).length === 0 ? (
              "—"
            ) : (
              <ul className="list-disc list-inside">
                {Object.entries(reportsByDisposition).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">By School</dt>
          <dd className="mt-0.5">
            {Object.keys(reportsBySchool).length === 0 ? (
              "—"
            ) : (
              <ul className="list-disc list-inside">
                {Object.entries(reportsBySchool).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">Earliest Occurred</dt>
          <dd>{earliestOccurred ? new Date(earliestOccurred).toLocaleString() : "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">Latest Occurred</dt>
          <dd>{latestOccurred ? new Date(latestOccurred).toLocaleString() : "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">Last Updated</dt>
          <dd>{lastUpdatedStr}</dd>
        </div>
      </dl>
    </div>
  );
}
