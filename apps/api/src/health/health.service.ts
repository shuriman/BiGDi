import { Injectable } from '@nestjs/common';
import { createPrismaClient } from '@zemo/shared/clients';
import { createRedisClient } from '@zemo/shared/clients';
import { createLogger } from '@zemo/shared/logger';

@Injectable()
export class HealthService {
  private prisma = createPrismaClient();
  private redis = createRedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
  private logger = createLogger('health-service');

  async checkBasic() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'zemo-api',
      version: '1.0.0',
    };
  }

  async checkDetailed() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk(),
    ]);

    const [db, redis, memory, disk] = checks;

    const overall = checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      service: 'zemo-api',
      version: '1.0.0',
      checks: {
        database: db.status === 'fulfilled' ? db.value : { status: 'error', error: db.reason },
        redis: redis.status === 'fulfilled' ? redis.value : { status: 'error', error: redis.reason },
        memory: memory.status === 'fulfilled' ? memory.value : { status: 'error', error: memory.reason },
        disk: disk.status === 'fulfilled' ? disk.value : { status: 'error', error: disk.reason },
      },
    };
  }

  async checkReadiness() {
    // Check if critical dependencies are ready
    const dbReady = await this.checkDatabase();
    const redisReady = await this.checkRedis();

    const ready = dbReady.status === 'ok' && redisReady.status === 'ok';

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbReady.status,
        redis: redisReady.status,
      },
    };
  }

  async checkLiveness() {
    // Simple check if the process is responsive
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  private async checkDatabase() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;

      return {
        status: 'ok',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ error }, 'Database health check failed');
      throw error;
    }
  }

  private async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const duration = Date.now() - start;

      return {
        status: 'ok',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ error }, 'Redis health check failed');
      throw error;
    }
  }

  private async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    const status = memUsagePercent > 90 ? 'critical' : memUsagePercent > 80 ? 'warning' : 'ok';

    return {
      status,
      process: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
      system: {
        total: `${Math.round(totalMem / 1024 / 1024)}MB`,
        used: `${Math.round(usedMem / 1024 / 1024)}MB`,
        free: `${Math.round(freeMem / 1024 / 1024)}MB`,
        usagePercent: Math.round(memUsagePercent),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDisk() {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      return {
        status: 'ok',
        path: process.cwd(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ error }, 'Disk health check failed');
      throw error;
    }
  }
}