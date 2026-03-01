const API_URL =
	(import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

/**
 * Raw crime log as returned by GraphQL API. Matches api/src/crime-log/crime-log.entity.ts
 */
export interface CrimeLogRow {
	id: string;
	schoolCode: string | null;
	caseNumber: string | null;
	reportDatetime: string | null;
	occurredDatetime: string | null;
	location: string | null;
	latitude: number | null;
	longitude: number | null;
	description: string | null;
	disposition: string | null;
	narrative: string | null;
}

/**
 * Normalized crime log shape for dashboard (table, map, summary).
 * Field names align with UI columns: Number (case #), School_Code, Reported_Date_Time, etc.
 */
export interface NormalizedCrimeLog {
	id: string;
	Number: string;
	School_Code: string;
	Reported_Date_Time: string;
	Occurred_From_Date_Time: string;
	Location: string;
	Description: string;
	Disposition: string;
	Narrative: string;
	latitude: number | null;
	longitude: number | null;
}

/**
 * School as returned by GraphQL API. Matches api/src/school/school.entity.ts
 */
export interface School {
	id: string;
	schoolCode: string | null;
	schoolName: string | null;
	address: string | null;
	city: string | null;
	stateCode: string | null;
	zipCode: number | null;
	primaryColor: string | null;
	secondaryColor: string | null;
	logo: string | null;
}

/** GraphQL error entry */
interface GraphQLError {
	message: string;
	locations?: unknown;
	path?: unknown;
}

/** Generic GraphQL response wrapper */
interface GraphQLResponse<T> {
	data?: T;
	errors?: GraphQLError[];
}

/** Crime logs query result */
interface CrimeLogsData {
	crimeLogs: CrimeLogRow[];
}

/** Schools query result */
interface SchoolsData {
	schools: School[];
}

/** NLP query response from POST /nlp_query */
interface NlpQueryResponse {
	data?: { crimeLogs?: CrimeLogRow[] };
	errors?: GraphQLError[];
	llmError?: string;
}

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
      primaryColor
      secondaryColor
      logo
    }
  }
`;

/**
 * Normalize API crime log to dashboard shape (table, map, summary).
 * Field names align with entity: schoolCode, caseNumber, reportDatetime, occurredDatetime,
 * location, latitude, longitude, description, disposition, narrative.
 */
export function normalizeCrimeLog(row: CrimeLogRow): NormalizedCrimeLog {
	return {
		id: row.id,
		Number: row.caseNumber ?? "",
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

export interface FetchCrimeLogsParams {
	occurredAfter: string;
	occurredBefore: string;
	schoolCode?: string;
}

/**
 * Fetch crime logs from GraphQL API.
 */
export async function fetchCrimeLogs({
	occurredAfter,
	occurredBefore,
	schoolCode,
}: FetchCrimeLogsParams): Promise<NormalizedCrimeLog[]> {
	const res = await fetch(`${API_URL}/graphql`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			query: CRIME_LOGS_QUERY,
			variables: {
				occurredAfter,
				occurredBefore,
				schoolCode: schoolCode?.trim() ? schoolCode.trim() : null,
			},
		}),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json: GraphQLResponse<CrimeLogsData> = await res.json();
	if (json.errors?.length)
		throw new Error(json.errors[0].message ?? "GraphQL error");
	const list = json.data?.crimeLogs ?? [];
	return list.map(normalizeCrimeLog);
}

/**
 * Call POST /nlp_query with a user prompt. The API runs an LLM to generate a GraphQL query,
 * executes it, and returns { data?, errors?, llmError? }. If data.crimeLogs exists, returns
 * normalized crime log records; otherwise throws.
 */
export async function fetchNlpQuery(
	prompt: string,
): Promise<NormalizedCrimeLog[]> {
	const res = await fetch(`${API_URL}/nlp_query`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ query: prompt }),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json: NlpQueryResponse = await res.json();
	if (json.llmError) throw new Error(json.llmError);
	if (json.errors?.length)
		throw new Error(json.errors[0].message ?? "GraphQL error");
	const data = json.data ?? {};
	const list = data.crimeLogs ?? [];
	return list.map(normalizeCrimeLog);
}

/**
 * Fetch all schools from GraphQL API. Matches api/src/school/school.entity.ts
 */
export async function fetchSchools(): Promise<School[]> {
	const res = await fetch(`${API_URL}/graphql`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ query: SCHOOLS_QUERY }),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json: GraphQLResponse<SchoolsData> = await res.json();
	if (json.errors?.length)
		throw new Error(json.errors[0].message ?? "GraphQL error");
	return json.data?.schools ?? [];
}
