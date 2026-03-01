import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { execute, parse, GraphQLError } from 'graphql';
import { readFileSync } from 'fs';
import { join } from 'path';

const SYSTEM_PROMPT = `You are a GraphQL query generator. Given a natural language question and the GraphQL schema below, output only a valid GraphQL query that answers the question. Use only the types and fields defined in the schema. Do not use variables; use literal values where needed. Output nothing but the GraphQL query. If the question cannot be answered with this schema or is ambiguous, respond with a single line starting with "ERROR: " followed by a clear explanation.`;

export interface NlpQueryResult {
  data?: unknown;
  errors?: Array<{ message: string }>;
  llmError?: string;
}

@Injectable()
export class NlpService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly schemaSdl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly schemaHost: GraphQLSchemaHost,
  ) {
    this.apiKey = this.configService.get<string>('API_KEY') ?? '';
    this.baseUrl =
      this.configService.get<string>('BASE_URL') ?? 'https://api.openai.com/v1';
    const schemaPath = join(process.cwd(), 'src/schema.gql');
    this.schemaSdl = readFileSync(schemaPath, 'utf-8');
  }

  async nlpQuery(query: string): Promise<NlpQueryResult> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      return {
        llmError: 'API_KEY is not configured',
      };
    }

    const messages = [
      {
        role: 'system' as const,
        content: SYSTEM_PROMPT + '\n\nSchema:\n' + this.schemaSdl,
      },
      { role: 'user' as const, content: query },
    ];

    console.log(messages);

    let body: string;
    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: this.configService.get<string>('MODEL') ?? 'gpt-4o-mini',
            messages,
            max_tokens: 4096,
            temperature: 0,
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        return {
          llmError: `LLM API error (${response.status}): ${errText}`,
        };
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (json.error?.message) {
        return { llmError: json.error.message };
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return { llmError: 'Empty response from LLM' };
      }

      body = content;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { llmError: `LLM request failed: ${message}` };
    }

    if (body.startsWith('ERROR:')) {
      return { llmError: body.replace(/^ERROR:\s*/i, '').trim() };
    }

    const graphqlQuery = this.extractGraphQLQuery(body);
    if (!graphqlQuery) {
      return {
        llmError: 'Could not extract a GraphQL query from the response',
      };
    }

    try {
      const document = parse(graphqlQuery);
      const schema = this.schemaHost.schema;
      const result = await execute({
        schema,
        document,
        contextValue: {},
      });

      if (result.errors?.length) {
        return {
          errors: result.errors.map((e: GraphQLError) => ({
            message: e.message,
          })),
        };
      }

      return { data: result.data };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { llmError: `GraphQL execution failed: ${message}` };
    }
  }

  private extractGraphQLQuery(text: string): string | null {
    const trimmed = text.trim();
    const codeBlockMatch = trimmed.match(/```(?:graphql)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    if (
      trimmed.startsWith('query ') ||
      trimmed.startsWith('{') ||
      /^\s*query\s+\w+/m.test(trimmed)
    ) {
      return trimmed;
    }
    return null;
  }
}
