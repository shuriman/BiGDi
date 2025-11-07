import { createLogger } from '@zemo/shared/logger';
import { createRedisClient } from '@zemo/shared/clients';
import { WorkerRegistry } from './queues/worker-registry';
import { setupGracefulShutdown } from './utils/graceful-shutdown';

const logger = createLogger('worker-bootstrap');

export async function bootstrap() {
  logger.info('Starting Zemo Worker service...');

  // Initialize Redis connection
  const redis = createRedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
  
  try {
    await redis.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to Redis');
    throw error;
  }

  // Initialize worker registry
  const workerRegistry = new WorkerRegistry(redis);
  
  try {
    await workerRegistry.initialize();
    logger.info('Worker registry initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize worker registry');
    throw error;
  }

  // Setup graceful shutdown
  setupGracefulShutdown(async () => {
    logger.info('Shutting down worker service...');
    
    try {
      await workerRegistry.close();
      await redis.disconnect();
      logger.info('Worker service stopped gracefully');
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
    }
    
    process.exit(0);
  });

  logger.info('Zemo Worker service started successfully');
  
  // Keep the process alive
  return new Promise(() => {});
}