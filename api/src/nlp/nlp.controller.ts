import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NlpService, NlpQueryResult } from './nlp.service';

class NlpQueryDto {
  query!: string;
}

/** Response shape for NLP query endpoint (for Swagger) */
export class NlpQueryResultDto {
  @ApiProperty({ required: false, description: 'GraphQL result data' })
  data?: unknown;
  @ApiProperty({ required: false, type: [Object], description: 'GraphQL errors' })
  errors?: Array<{ message: string }>;
  @ApiProperty({ required: false, description: 'LLM or config error message' })
  llmError?: string;
}

@ApiTags('nlp')
@Controller()
export class NlpController {
  constructor(private readonly nlpService: NlpService) {}

  @Post('nlp_query')
  @ApiOperation({
    summary: 'Natural language to GraphQL',
    description:
      'Send a natural language question; the API runs an LLM to generate a GraphQL query, executes it, and returns the result (or errors).',
  })
  @ApiBody({
    description: 'Natural language question about campus crime data',
    schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'GraphQL result or error', type: NlpQueryResultDto })
  async nlpQuery(@Body() dto: NlpQueryDto): Promise<NlpQueryResult> {
    const query = typeof dto.query === 'string' ? dto.query.trim() : '';
    if (!query) {
      return { llmError: 'Missing or empty "query" parameter' };
    }
    return this.nlpService.nlpQuery(query);
  }
}
