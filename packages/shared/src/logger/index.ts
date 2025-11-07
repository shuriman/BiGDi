import pino, { Logger } from 'pino';

let logger: Logger | null = null;

export function createLogger(name: string): Logger {
  if (!logger) {
    logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label })
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: require('os').hostname(),
        service: name
      }
    });
  }
  return logger.child({ service: name });
}

export function createLoggerMiddleware(serviceName: string) {
  const logger = createLogger(serviceName);
  
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    req.logger = logger.child({ requestId });
    
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      req.logger.info({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent']
      }, 'HTTP request completed');
    });
    
    next();
  };
}