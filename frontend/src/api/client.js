const API_URL = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:3000/graphql";

/**
 * GraphQL query for crimeLogs. Matches api/src/crime-log/crime-log.entity.ts
 */
const CRIME_LOGS_QUERY = `
  query CrimeLogs($occurredAfter: DateTime!, $occurredBefore: DateTime!) {
    crimeLogs(occurredAfter: $occurredAfter, occurredBefore: $occurredBefore) {
      id
      schoolCode
      caseNumber
      reportDatetime
      occurredDatetime
      location
      latitude
      longitude
      description
      disposition
      narrative
    }
  }
`;

/**
 * Normalize API crime log to dashboard shape (table, map, summary).
 * Field names align with entity: schoolCode, caseNumber, reportDatetime, occurredDatetime,
 * location, latitude, longitude, description, disposition, narrative.
 */
export function normalizeCrimeLog(row) {
  return {
    id: row.id,
    Number: row.caseNumber,
    School_Code: row.schoolCode ?? "",
    Reported_Date_Time: row.reportDatetime ?? row.occurredDatetime ?? "",
    Occurred_From_Date_Time: row.occurredDatetime ?? "",
    Location: row.location ?? "",
    Description: row.description ?? "",
    Disposition: row.disposition ?? "",
    Narrative: row.narrative ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}

/**
 * Fetch crime logs from GraphQL API.
 * @param {{ occurredAfter: string, occurredBefore: string }} params - ISO date strings
 * @returns {Promise<Array>} Normalized records
 */
export async function fetchCrimeLogs({ occurredAfter, occurredBefore }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: CRIME_LOGS_QUERY,
      variables: { occurredAfter, occurredBefore },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message ?? "GraphQL error");
  const list = json.data?.crimeLogs ?? [];
  return list.map(normalizeCrimeLog);
}
