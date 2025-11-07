import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    return this.healthService.checkBasic();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async checkDetailed() {
    return this.healthService.checkDetailed();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readiness() {
    return this.healthService.checkReadiness();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    return this.healthService.checkLiveness();
  }
}