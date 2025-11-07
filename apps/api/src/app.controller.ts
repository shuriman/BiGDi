import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Get API info' })
  getInfo() {
    return {
      name: 'Zemo API',
      version: '1.0.0',
      description: 'Zemo modular architecture API service',
      timestamp: new Date().toISOString(),
    };
  }
}