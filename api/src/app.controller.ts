import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health / root', description: 'Simple health check or welcome response.' })
  @ApiResponse({ status: 200, description: 'OK', schema: { type: 'string', example: 'UniCrime API' } })
  getHello(): string {
    return this.appService.getHello();
  }
}
