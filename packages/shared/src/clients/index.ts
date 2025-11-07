import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';

let prisma: PrismaClient | null = null;
let redis: Redis | null = null;

export function createPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'minimal'
    });
  }
  return prisma;
}

export function createRedisClient(url: string): Redis {
  if (!redis) {
    redis = new Redis(url, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }
  return redis;
}

export function createQueue(name: string, redis: Redis): Queue {
  return new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });
}

export function createWorker(
  name: string,
  processor: (job: any) => Promise<any>,
  redis: Redis
): Worker {
  return new Worker(name, processor, {
    connection: redis,
    concurrency: parseInt(process.env[`JOBS_CONCURRENCY_${name.toUpperCase()}`] || '1'),
    limiter: {
      max: 10,
      duration: 60000
    }
  });
}