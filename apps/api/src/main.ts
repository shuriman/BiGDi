import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { createLogger } from '@zemo/shared/logger';
import { createLoggerMiddleware } from '@zemo/shared/logger';

async function bootstrap() {
  const logger = createLogger('api');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  const configService = app.get(ConfigService);
  
  // Apply logging middleware
  app.use(createLoggerMiddleware('api'));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || '*',
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Zemo API')
      .setDescription('Zemo modular architecture API')
      .setVersion('1.0')
      .addTag('jobs')
      .addTag('settings')
      .addTag('prompts')
      .addTag('analytics')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Metrics endpoint
  app.get('/metrics', async (request, reply) => {
    const { getMetricsRegistry } = await import('@zemo/shared/metrics');
    reply.type('text/plain');
    return await getMetricsRegistry().metrics();
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  logger.info(`Zemo API service started on port ${port}`);
}

bootstrap().catch((error) => {
  const logger = createLogger('api');
  logger.error({ error }, 'Failed to start API service');
  process.exit(1);
});