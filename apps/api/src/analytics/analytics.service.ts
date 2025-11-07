import { Injectable } from '@nestjs/common';
import { createPrismaClient } from '@zemo/shared/clients';
import { createLogger } from '@zemo/shared/logger';

@Injectable()
export class AnalyticsService {
  private prisma = createPrismaClient();
  private logger = createLogger('analytics-service');

  async getPreviewData(promptKey?: string) {
    // Return sample data for prompt preview
    // In a real implementation, this would fetch actual data
    return {
      keywords: [
        { keyword: 'example keyword', frequency: 100, trend: 'up' },
        { keyword: 'another keyword', frequency: 75, trend: 'stable' },
      ],
      serpResults: [
        { title: 'Example Result 1', url: 'https://example.com/1', position: 1 },
        { title: 'Example Result 2', url: 'https://example.com/2', position: 2 },
      ],
      headings: [
        { text: 'Main Heading', level: 1, frequency: 1 },
        { text: 'Sub Heading', level: 2, frequency: 3 },
      ],
      generatedContent: promptKey ? 
        `Sample generated content for prompt: ${promptKey}` : 
        'Sample generated content',
    };
  }

  async getDashboardData(timeRange: string = '7d') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      totalUsers,
    ] = await Promise.all([
      this.prisma.job.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.job.count({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
      }),
      this.prisma.job.count({
        where: {
          createdAt: { gte: startDate },
          status: 'FAILED',
        },
      }),
      this.prisma.job.count({
        where: {
          status: 'RUNNING',
        },
      }),
      this.prisma.user.count(),
    ]);

    const jobTypes = await this.prisma.job.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: {
        type: true,
      },
    });

    return {
      summary: {
        totalJobs,
        completedJobs,
        failedJobs,
        activeJobs,
        totalUsers,
        successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
      },
      jobTypes: jobTypes.map(item => ({
        type: item.type.toLowerCase(),
        count: item._count.type,
      })),
      timeRange,
    };
  }

  async getJobAnalytics(timeRange: string = '7d') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get average job duration by type
    const jobDurations = await this.prisma.job.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'COMPLETED',
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        type: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const durationsByType = jobDurations.reduce((acc, job) => {
      const duration = (job.completedAt!.getTime() - job.startedAt!.getTime()) / 1000; // seconds
      if (!acc[job.type]) {
        acc[job.type] = { total: 0, count: 0 };
      }
      acc[job.type].total += duration;
      acc[job.type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      averageDurations: Object.entries(durationsByType).map(([type, data]) => ({
        type: type.toLowerCase(),
        averageDuration: data.total / data.count,
        count: data.count,
      })),
      timeRange,
    };
  }

  async getPerformanceMetrics(timeRange: string = '1h') {
    // This would typically fetch from Prometheus or similar monitoring system
    // For now, return sample data
    return {
      cpu: {
        current: 45.2,
        average: 38.7,
        peak: 72.1,
      },
      memory: {
        current: 2.1,
        total: 4.0,
        percentage: 52.5,
      },
      requests: {
        total: 1234,
        errors: 12,
        averageLatency: 145,
        p95Latency: 280,
      },
      queues: {
        pending: 5,
        active: 3,
        failed: 1,
      },
      timeRange,
    };
  }
}