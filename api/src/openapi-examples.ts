/**
 * API documentation code examples
 * ---------------------------------
 * Edit this file to change the examples shown in Scalar (/api-docs-scalar) and Swagger (/api-docs).
 * - GraphQL request examples: graphqlRequestExamples
 * - GraphQL response example: graphqlResponseExample
 * REST examples (e.g. POST /nlp_query) are defined in the controller: see nlp.controller.ts
 * (NlpQueryDto and NlpQueryResultDto @ApiProperty example values).
 */

/** GraphQL request body examples (shown in the docs for POST /graphql) */
export const graphqlRequestExamples = {
  crimeLogs: {
    summary: 'List crime logs for a school in a date range',
    value: {
      query:
        'query { crimeLogs(schoolCode: "001775", occurredAfter: "2024-01-01T00:00:00Z", occurredBefore: "2024-12-31T23:59:59Z") { id caseNumber occurredDatetime location description disposition } }',
    },
  },
  schools: {
    summary: 'List all schools',
    value: {
      query: 'query { schools { id schoolCode schoolName city stateCode } }',
    },
  },
  singleCrimeLog: {
    summary: 'Fetch one crime log by ID',
    value: {
      query:
        'query { crimeLog(id: "1") { id schoolCode caseNumber occurredDatetime location description narrative } }',
    },
  },
};

/** GraphQL 200 response example (field names must match schema.gql / CrimeLog entity) */
export const graphqlResponseExample = {
  data: {
    crimeLogs: [
      {
        id: '1',
        schoolCode: '001775',
        caseNumber: '24-001',
        occurredDatetime: '2024-06-15T14:30:00Z',
        location: 'Library',
        description: 'Theft',
        disposition: 'Referred',
      },
    ],
  },
  errors: null,
};
