const API_URL =
	import.meta.env.VITE_GRAPHQL_URL || "http://localhost:3000/graphql";

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
