import { createLogger } from '@zemo/shared/logger';

const logger = createLogger('graceful-shutdown');

export function setupGracefulShutdown(handler: () => Promise<void>): void {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    
    try {
      await handler();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  // Handle various shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });
}