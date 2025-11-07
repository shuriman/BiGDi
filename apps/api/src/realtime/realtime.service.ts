import { Injectable } from '@nestjs/common';
import { createPrismaClient } from '@zemo/shared/clients';
import { createLogger } from '@zemo/shared/logger';

@Injectable()
export class RealtimeService {
  private prisma = createPrismaClient();
  private logger = createLogger('realtime-service');

  async getJobStatus(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

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
      recentLogs: job.logs.map(log => ({
        id: log.id,
        level: log.level.toLowerCase(),
        message: log.message,
        step: log.step,
        createdAt: log.createdAt,
      })),
    };
  }

  async getActiveJobsCount() {
    return this.prisma.job.count({
      where: {
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
    });
  }

  async getSystemStats() {
    const [
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
    ] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.job.count({
        where: { status: 'FAILED' },
      }),
      this.prisma.job.count({
        where: {
          status: {
            in: ['PENDING', 'RUNNING'],
          },
        },
      }),
    ]);

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
    };
  }
}