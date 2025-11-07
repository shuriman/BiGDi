import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(ThrottlerGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('preview-data')
  @ApiOperation({ summary: 'Get data for prompt preview' })
  @ApiResponse({ status: 200, description: 'Preview data retrieved successfully' })
  async getPreviewData(@Query('promptKey') promptKey?: string) {
    return this.analyticsService.getPreviewData(promptKey);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(@Query('timeRange') timeRange: string = '7d') {
    return this.analyticsService.getDashboardData(timeRange);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get job analytics' })
  @ApiResponse({ status: 200, description: 'Job analytics retrieved successfully' })
  async getJobAnalytics(@Query('timeRange') timeRange: string = '7d') {
    return this.analyticsService.getJobAnalytics(timeRange);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(@Query('timeRange') timeRange: string = '1h') {
    return this.analyticsService.getPerformanceMetrics(timeRange);
  }
}