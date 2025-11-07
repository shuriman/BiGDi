import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateJobRequest, JobResponse } from '@zemo/shared/dto';
import { JobsService } from './jobs.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(ThrottlerGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, description: 'Job created successfully', type: JobResponse })
  async createJob(@Body() createJobRequest: CreateJobRequest, @Request() req): Promise<JobResponse> {
    return this.jobsService.createJob(createJobRequest, req.user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job details', type: JobResponse })
  async getJob(@Param('id') id: string): Promise<JobResponse> {
    return this.jobsService.getJob(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get job logs' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async getJobLogs(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.jobsService.getJobLogs(id, page, limit);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs with pagination' })
  async listJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.jobsService.listJobs(page, limit, status, type);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a running job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async cancelJob(@Param('id') id: string) {
    return this.jobsService.cancelJob(id);
  }
}