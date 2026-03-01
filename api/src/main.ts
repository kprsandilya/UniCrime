import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
      'REST and GraphQL API for UniCrime. ' +
        '**GraphQL**: interactive docs (GraphiQL) at `GET /graphiql`; send queries with `POST /graphql`.',
    )
    .setVersion('1.0')
    .addTag('app', 'Health / root')
    .addTag('nlp', 'Natural language to GraphQL')
    .addTag('GraphQL', 'GraphQL endpoint and GraphiQL playground')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Add GraphQL endpoint to Swagger so it appears in the same UI
  document.paths = document.paths ?? {};
  document.paths['/graphql'] = {
    post: {
      tags: ['GraphQL'],
      summary: 'GraphQL endpoint',
      description:
        'Execute a GraphQL query or mutation. For interactive schema exploration and docs, open **GraphiQL** at `GET /graphiql` in your browser.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['query'],
              properties: {
                query: {
                  type: 'string',
                  description: 'GraphQL query or mutation',
                },
                operationName: { type: 'string', nullable: true },
                variables: {
                  type: 'object',
                  nullable: true,
                  additionalProperties: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'GraphQL response (data and/or errors)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    nullable: true,
                    description: 'Result data',
                  },
                  errors: {
                    type: 'array',
                    nullable: true,
                    items: {
                      type: 'object',
                      properties: { message: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  document.paths['/graphiql'] = {
    get: {
      tags: ['GraphQL'],
      summary: 'GraphiQL UI',
      description:
        'Open this URL in a browser to use the **GraphiQL** interactive playground and schema docs.',
      responses: {
        200: { description: 'GraphiQL HTML UI' },
      },
    },
  };

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { docExpansion: 'list', tryItOutEnabled: true },
  });

  await app.listen(3000);
}

void bootstrap();
