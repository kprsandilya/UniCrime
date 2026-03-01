import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NlpService, NlpQueryResult } from './nlp.service';

/** Request body for POST /nlp_query. Schema in docs is generated from this class. */
export class NlpQueryDto {
  @ApiProperty({
    description: 'Natural-language question about campus crime or schools',
    example: 'thefts at Purdue in the last 7 days',
  })
  query!: string;
}

/** Response shape for POST /nlp_query. Schema in docs is generated from this class. */
export class NlpQueryResultDto {
  @ApiProperty({
    required: false,
    description: 'GraphQL result data when the generated query runs successfully',
    example: {
      crimeLogs: [
        { id: '1', caseNumber: '24-001', description: 'Theft', location: 'Library' },
      ],
    },
  })
  data?: unknown;
  @ApiProperty({
    required: false,
    description: 'GraphQL errors if the generated query failed or was invalid',
    example: [{ message: 'Field "x" does not exist on type "Query".' }],
  })
  errors?: Array<{ message: string }>;
  @ApiProperty({
    required: false,
    description: 'Set when the LLM call failed, API key is missing, or the user query was empty',
    example: 'API_KEY is not configured',
  })
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
  @ApiBody({ type: NlpQueryDto, description: 'Natural language question about campus crime data' })
  @ApiResponse({ status: 200, description: 'GraphQL result or error', type: NlpQueryResultDto })
  async nlpQuery(@Body() dto: NlpQueryDto): Promise<NlpQueryResult> {
    const query = typeof dto.query === 'string' ? dto.query.trim() : '';
    if (!query) {
      return { llmError: 'Missing or empty "query" parameter' };
    }
    return this.nlpService.nlpQuery(query);
  }
}
