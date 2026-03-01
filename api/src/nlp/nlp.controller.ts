import { Body, Controller, Post } from '@nestjs/common';
import { NlpService, NlpQueryResult } from './nlp.service';

class NlpQueryDto {
  query!: string;
}

@Controller()
export class NlpController {
  constructor(private readonly nlpService: NlpService) {}

  @Post('nlp_query')
  async nlpQuery(@Body() dto: NlpQueryDto): Promise<NlpQueryResult> {
    const query = typeof dto.query === 'string' ? dto.query.trim() : '';
    if (!query) {
      return { llmError: 'Missing or empty "query" parameter' };
    }
    return this.nlpService.nlpQuery(query);
  }
}
