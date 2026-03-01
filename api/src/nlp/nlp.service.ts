import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { execute, parse, GraphQLError, printSchema } from 'graphql';
import { SchoolService } from '../school/school.service';

const SYSTEM_PROMPT = `You are a GraphQL query generator. Your response must contain ONLY one of these two things—nothing else:
1. A single valid GraphQL query (no explanation, no reasoning, no text before or after), or
2. A single line starting with "ERROR: " if the question cannot be answered or is ambiguous.

Rules:
- Use only types and fields from the schema below. Do not use variables; use literal values.
- Unless the user asks for fewer fields, request all fields of the returned type.
- Do not output <think> tags, commentary, or any text other than the query or ERROR line.
- The current date for date calculations is ${new Date().toISOString()}.`;

export interface NlpQueryResult {
  data?: unknown;
  errors?: Array<{ message: string }>;
  llmError?: string;
}

@Injectable()
export class NlpService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly schemaHost: GraphQLSchemaHost,
    private readonly schoolService: SchoolService,
  ) {
    this.apiKey = this.configService.get<string>('API_KEY') ?? '';
    this.baseUrl =
      this.configService.get<string>('BASE_URL') ?? 'https://api.openai.com/v1';
  }

  /** Schema SDL from the in-memory GraphQL schema (avoids depending on schema.gql file). */
  private get schemaSdl(): string {
    return printSchema(this.schemaHost.schema);
  }

  async nlpQuery(query: string): Promise<NlpQueryResult> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      return {
        llmError: 'API_KEY is not configured',
      };
    }

    const schools = await this.schoolService.findAll();
    const schoolList = schools
      .filter((s) => s.schoolCode != null && s.schoolName != null)
      .map((s) => ({ schoolCode: s.schoolCode!, schoolName: s.schoolName! }));
    const schoolsContext =
      schoolList.length > 0
        ? `\n\nReference: schools in the database (use schoolCode in queries):\n${JSON.stringify(schoolList, null, 2)}`
        : '';

    const messages = [
      {
        role: 'system' as const,
        content:
          SYSTEM_PROMPT + '\n\nSchema:\n' + this.schemaSdl + schoolsContext,
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
      console.log(response);

      if (!response.ok) {
        const errText = await response.text();
        console.log(errText);
        return {
          llmError: `LLM API error (${response.status}): ${errText}`,
        };
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      console.log(json);

      if (json.error?.message) {
        return { llmError: json.error.message };
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      console.log(content);
      if (!content) {
        return { llmError: 'Empty response from LLM' };
      }

      body = this.stripThinkBlocks(content);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { llmError: `LLM request failed: ${message}` };
    }

    if (body.startsWith('ERROR:')) {
      return { llmError: body.replace(/^ERROR:\s*/i, '').trim() };
    }

    const graphqlQuery = this.extractGraphQLQuery(body);
    console.log(graphqlQuery);
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

  private stripThinkBlocks(text: string): string {
    // Remove everything at or before the final </think> (handles stray closing tag + preamble)
    const closingTag = '</think>';
    const lastClose = text.toLowerCase().lastIndexOf(closingTag);
    if (lastClose !== -1) {
      text = text.slice(lastClose + closingTag.length);
    }
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .trim();
  }

  private extractGraphQLQuery(text: string): string | null {
    const trimmed = text.trim();
    const codeBlockMatch = trimmed.match(/```(?:graphql)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      const inner = codeBlockMatch[1].trim();
      const fromInner = this.extractGraphQLQueryFromText(inner);
      return fromInner ?? inner;
    }
    return this.extractGraphQLQueryFromText(trimmed);
  }

  /** Extracts the first complete GraphQL query (brace-matched) and drops any trailing text. */
  private extractGraphQLQueryFromText(text: string): string | null {
    const trimmed = text.trim();
    const startMatch = trimmed.match(/(\bquery\s+\w*\s*)?\{/);
    if (!startMatch || startMatch.index === undefined) return null;
    const start = startMatch.index;
    const firstBrace = start + startMatch[0].length - 1;
    let depth = 1;
    for (let i = firstBrace + 1; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return trimmed.slice(start, i + 1).trim();
      }
    }
    return null;
  }
}
