const API_URL =
	import.meta.env.VITE_GRAPHQL_URL || "http://localhost:3000/graphql";

/** Base URL for REST endpoints (e.g. /nlp_query) */
const API_BASE = API_URL.replace(/\/graphql\/?$/, "") || "http://localhost:3000";

/**
 * GraphQL query for crimeLogs. Matches api/src/crime-log/crime-log.entity.ts
 * schoolCode is optional; when set, filters server-side.
 */
const CRIME_LOGS_QUERY = `
  query CrimeLogs($occurredAfter: DateTime!, $occurredBefore: DateTime!, $schoolCode: String) {
    crimeLogs(occurredAfter: $occurredAfter, occurredBefore: $occurredBefore, schoolCode: $schoolCode) {
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
 * GraphQL query for schools. Matches api/src/school/school.entity.ts
 */
const SCHOOLS_QUERY = `
  query Schools {
    schools {
      id
      schoolCode
      schoolName
      address
      city
      stateCode
      zipCode
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
 * @param {{ occurredAfter: string, occurredBefore: string, schoolCode?: string }} params
 * @returns {Promise<Array>} Normalized records
 */
export async function fetchCrimeLogs({
	occurredAfter,
	occurredBefore,
	schoolCode,
}) {
	const res = await fetch(API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			query: CRIME_LOGS_QUERY,
			variables: {
				occurredAfter,
				occurredBefore,
				schoolCode: schoolCode && schoolCode.trim() ? schoolCode.trim() : null,
			},
		}),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json = await res.json();
	console.log(json);
	if (json.errors?.length)
		throw new Error(json.errors[0].message ?? "GraphQL error");
	const list = json.data?.crimeLogs ?? [];
	return list.map(normalizeCrimeLog);
}

/**
 * Call POST /nlp_query with a user prompt. The API runs an LLM to generate a GraphQL query,
 * executes it, and returns { data?, errors?, llmError? }. If data.crimeLogs exists, returns
 * normalized crime log records; otherwise throws.
 * @param {string} prompt - Natural language prompt (e.g. "Show thefts at Purdue last week")
 * @returns {Promise<Array>} Normalized crime log records for table/map
 */
export async function fetchNlpQuery(prompt) {
	const res = await fetch(`${API_BASE}/nlp_query`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ query: prompt }),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json = await res.json();
	if (json.llmError)
		throw new Error(json.llmError);
	if (json.errors?.length)
		throw new Error(json.errors[0].message ?? "GraphQL error");
	const data = json.data ?? {};
	const list = data.crimeLogs ?? [];
	return list.map(normalizeCrimeLog);
}

/**
 * Fetch all schools from GraphQL API. Matches api/src/school/school.entity.ts
 * @returns {Promise<Array<{ id: string, schoolCode: string|null, schoolName: string|null, ... }>>}
 */
export async function fetchSchools() {
	const res = await fetch(API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ query: SCHOOLS_QUERY }),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json = await res.json();
	if (json.errors?.length)
		throw new Error(json.errors[0].message ?? "GraphQL error");
	return json.data?.schools ?? [];
}
