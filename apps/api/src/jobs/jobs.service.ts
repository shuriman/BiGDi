import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateJobRequest, JobResponse, JobType, JobStatus } from '@zemo/shared/dto';
import { createPrismaClient } from '@zemo/shared/clients';
import { createLogger } from '@zemo/shared/logger';
import { jobsTotal, jobsDuration } from '@zemo/shared/metrics';

@Injectable()
export class JobsService {
  private prisma = createPrismaClient();
  private logger = createLogger('jobs-service');

  constructor(@InjectQueue('jobs') private jobsQueue: Queue) {}

  async createJob(createJobRequest: CreateJobRequest, userId?: string): Promise<JobResponse> {
    this.logger.info({ type: createJobRequest.type, userId }, 'Creating new job');

    try {
      const job = await this.prisma.job.create({
        data: {
          type: createJobRequest.type as JobType,
          payload: createJobRequest.params,
          priority: createJobRequest.priority,
          createdBy: userId,
        },
      });

      // Add to BullMQ queue
      await this.jobsQueue.add(
        createJobRequest.type,
        {
          jobId: job.id,
          ...createJobRequest.params,
        },
        {
          delay: createJobRequest.delay,
          priority: createJobRequest.priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      jobsTotal.inc({ type: createJobRequest.type, status: 'created' });

      return this.mapToJobResponse(job);
    } catch (error) {
      this.logger.error({ error, createJobRequest }, 'Failed to create job');
      throw new BadRequestException('Failed to create job');
    }
  }

  async getJob(id: string): Promise<JobResponse> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.mapToJobResponse(job);
  }

  async getJobLogs(jobId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      this.prisma.jobLog.findMany({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jobLog.count({
        where: { jobId },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async listJobs(
    page: number = 1,
    limit: number = 20,
    status?: string,
    type?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }
    if (type) {
      where.type = type.toUpperCase();
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs: jobs.map(this.mapToJobResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async cancelJob(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.RUNNING) {
      throw new BadRequestException(`Job cannot be cancelled in ${job.status} status`);
    }

    // Cancel in BullMQ
    const bullJob = await this.jobsQueue.getJob(id);
    if (bullJob) {
      await bullJob.remove();
    }

    // Update status in database
    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    jobsTotal.inc({ type: job.type, status: 'cancelled' });

    return this.mapToJobResponse(updatedJob);
  }

  private mapToJobResponse(job: any): JobResponse {
    return {
      id: job.id,
      type: job.type.toLowerCase(),
      status: job.status.toLowerCase(),
      progress: job.total ? {
        current: job.progress,
        total: job.total,
        message: job.message,
      } : undefined,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }
}