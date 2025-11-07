import { Job } from 'bullmq';
import { createLogger } from '@zemo/shared/logger';
import { createPrismaClient } from '@zemo/shared/clients';
import { JobStatus } from '@zemo/shared/domain';

export abstract class BaseProcessor {
  protected logger = createLogger(this.constructor.name.replace('Processor', '').toLowerCase());
  protected prisma = createPrismaClient();

  abstract process(job: Job): Promise<any>;

  protected async updateJobStatus(jobId: string, status: JobStatus, updates?: any) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...updates,
    };

    if (status === JobStatus.RUNNING) {
      updateData.startedAt = new Date();
    } else if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });

    this.logger.info({ jobId, status, updates }, 'Job status updated');
  }

  protected async logJobMessage(jobId: string, level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, step?: string, metadata?: any) {
    await this.prisma.jobLog.create({
      data: {
        jobId,
        level,
        message,
        step,
        metadata,
      },
    });

    this.logger.log(level.toLowerCase(), { jobId, step, metadata }, message);
  }

  protected async updateJobProgress(jobId: string, current: number, total: number, message?: string, step?: string) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        progress: current,
        total,
        message,
      },
    });

    // Also log the progress
    await this.logJobMessage(jobId, 'INFO', message || `Progress: ${current}/${total}`, step);
  }
}