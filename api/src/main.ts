import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  graphqlRequestExamples,
  graphqlResponseExample,
} from './openapi-examples';

/** Scalar API Reference HTML (CDN-based; avoids ESM-only package in Node/serverless) */
const SCALAR_HTML = `<!doctype html>
<html>
  <head>
    <title>UniCrime API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: '/openapi.json',
      });
    </script>
  </body>
</html>`;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: true, // allow all origins (reflects request origin)
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('UniCrime API')
    .setDescription(
      [
        '## Overview',
        'UniCrime exposes **campus crime log and school data** via REST and GraphQL. Use it to query Clery Act–style crime logs by school, date range, location, description, and more.',
        '',
        '## Capabilities',
        '- **REST**: Health check (`GET /`), natural-language query (`POST /nlp_query`).',
        '- **GraphQL**: Execute queries at `POST /graphql`. Filter crime logs by school, date range, case number, location, description, disposition, narrative; list and fetch schools by code or state.',
        '- **GraphiQL**: Interactive GraphQL playground and schema docs at `GET /graphiql`.',
        '- **NLP**: Send a natural-language question to `POST /nlp_query`; an LLM generates a GraphQL query, the API runs it, and returns the result (requires `API_KEY` in server config).',
        '',
        '## Authentication',
        'No authentication is required. Secure the API at the network or gateway if needed.',
        '',
        '## GraphQL schema summary',
        '- **Queries**: `crimeLogs` (filtered list), `crimeLog(id)`, `schools(schoolCode?, stateCode?)`, `school(id)`.',
        '- **Types**: `CrimeLog` (id, schoolCode, caseNumber, reportDatetime, occurredDatetime, location, latitude, longitude, description, disposition, narrative), `School` (id, schoolCode, schoolName, address, city, stateCode, zipCode, primaryColor, secondaryColor, logo).',
        '',
        '## Base URL',
        'Default port 3000 when self-hosting. On Vercel, use your deployment URL.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://your-vercel-app.vercel.app', 'Vercel (replace with your deployment URL)')
    .addTag('app', 'Health and root')
    .addTag('nlp', 'Natural language to GraphQL (LLM-generated queries)')
    .addTag('GraphQL', 'GraphQL endpoint and GraphiQL playground')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Enrich OpenAPI with detailed path descriptions and examples.
  // To edit code examples: GraphQL → openapi-examples.ts; REST (e.g. /nlp_query) → nlp.controller.ts DTOs.
  document.paths = document.paths ?? {};
  document.paths['/graphql'] = {
    post: {
      tags: ['GraphQL'],
      summary: 'Execute a GraphQL query',
      description: [
        'Send a GraphQL query in the request body. The API supports read-only **queries** (no mutations).',
        '',
        '**Available queries:**',
        '- `crimeLogs(schoolCode, occurredAfter, occurredBefore, caseNumber, location, description, disposition, narrative)` — List crime log entries with optional filters.',
        '- `crimeLog(id: String!)` — Fetch a single crime log by ID.',
        '- `schools(schoolCode, stateCode)` — List schools; filter by code or state.',
        '- `school(id: String!)` — Fetch a single school by ID.',
        '',
        '**Types (match schema.gql / crime-log.entity.ts, school.entity.ts):** `CrimeLog` (id, schoolCode, caseNumber, reportDatetime, occurredDatetime, location, latitude, longitude, description, disposition, narrative). `School` (id, schoolCode, schoolName, address, city, stateCode, zipCode, primaryColor, secondaryColor, logo).',
        '',
        'Use **GraphiQL** at `GET /graphiql` for interactive exploration.',
      ].join('\n'),
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['query'],
              properties: {
                query: { type: 'string', description: 'GraphQL query string' },
                operationName: { type: 'string', nullable: true },
                variables: { type: 'object', nullable: true, additionalProperties: true },
              },
            },
            examples: graphqlRequestExamples,
          },
        },
      },
      responses: {
        200: {
          description: 'GraphQL response: result in `data`, or errors in `errors`',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', nullable: true, description: 'Query result' },
                  errors: {
                    type: 'array',
                    nullable: true,
                    items: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                        path: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
              example: graphqlResponseExample,
            },
          },
        },
        400: { description: 'Bad request (e.g. invalid JSON or missing query)' },
      },
    },
  };
  document.paths['/graphiql'] = {
    get: {
      tags: ['GraphQL'],
      summary: 'GraphiQL interactive playground',
      description: [
        'Open in a browser to use **GraphiQL**: schema explorer, auto-complete, query history, and execution against `POST /graphql`.',
      ].join('\n'),
      responses: { 200: { description: 'GraphiQL HTML UI' } },
    },
  };
  const rootPath = document.paths['/'];
  if (rootPath?.get) {
    rootPath.get.summary = 'Health / root';
    rootPath.get.description =
      'Simple health or welcome response. Use it to verify the API is running.';
    rootPath.get.responses = rootPath.get.responses ?? {};
    rootPath.get.responses['200'] = {
      description: 'OK',
      content: { 'text/plain': { schema: { type: 'string', example: 'UniCrime API' } } },
    };
  }
  const nlpPath = document.paths['/nlp_query'];
  if (nlpPath?.post) {
    nlpPath.post.summary = 'Natural language to GraphQL';
    nlpPath.post.description = [
      'Send a **natural-language question** about campus crime data. The server uses an LLM to generate a GraphQL query, executes it, and returns the result.',
      '',
      '**Requirements:** `API_KEY` (and optionally `BASE_URL`) must be set in the server environment.',
      '',
      '**Request body:** `{ "query": "your question" }` — e.g. "thefts at Purdue in the last 7 days", "list all schools in Illinois".',
      '',
      '**Response:** GraphQL `data`/`errors`, or `llmError` if the LLM call failed or the API key is missing.',
    ].join('\n');
  }

  // Swagger UI at /api-docs (existing)
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { docExpansion: 'list', tryItOutEnabled: true },
  });

  // Scalar API docs at /api-docs-scalar (CDN-based; no ESM package in Node → avoids ERR_REQUIRE_ESM on serverless)
  const httpAdapter = app.getHttpAdapter();
  const fastify = httpAdapter.getInstance();

  fastify.get('/openapi.json', (_request, reply) => {
    reply.type('application/json').send(document);
  });
  fastify.get('/api-docs-scalar', (_request, reply) => {
    reply.type('text/html').send(SCALAR_HTML);
  });
  fastify.get('/api-docs-scalar/', (_request, reply) => {
    reply.type('text/html').send(SCALAR_HTML);
  });

  await app.listen(3000);
}

void bootstrap();
