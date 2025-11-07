import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createLogger } from '@zemo/shared/logger';
import { SerpApiProcessor } from '../processors/serpapi-processor';
import { ScrapeProcessor } from '../processors/scrape-processor';
import { AnalyzeProcessor } from '../processors/analyze-processor';
import { GenerateProcessor } from '../processors/generate-processor';
import { PipelineProcessor } from '../processors/pipeline-processor';

export class WorkerRegistry {
  private workers: Worker[] = [];
  private logger = createLogger('worker-registry');

  constructor(private redis: Redis) {}

  async initialize() {
    this.logger.info('Initializing workers...');

    const processors = [
      { name: 'serpapi', processor: new SerpApiProcessor() },
      { name: 'scrape', processor: new ScrapeProcessor() },
      { name: 'analyze', processor: new AnalyzeProcessor() },
      { name: 'generate', processor: new GenerateProcessor() },
      { name: 'pipeline', processor: new PipelineProcessor() },
    ];

    for (const { name, processor } of processors) {
      const concurrency = parseInt(process.env[`JOBS_CONCURRENCY_${name.toUpperCase()}`] || '1');
      
      const worker = new Worker(
        name,
        async (job) => {
          this.logger.info({ jobId: job.id, type: name }, 'Processing job');
          return processor.process(job);
        },
        {
          connection: this.redis,
          concurrency,
          limiter: {
            max: 10,
            duration: 60000, // 1 minute
          },
        }
      );

      worker.on('completed', (job) => {
        this.logger.info({ jobId: job.id, type: name }, 'Job completed');
      });

      worker.on('failed', (job, err) => {
        this.logger.error({ jobId: job?.id, type: name, error: err }, 'Job failed');
      });

      worker.on('error', (err) => {
        this.logger.error({ error: err }, `Worker error for ${name}`);
      });

      this.workers.push(worker);
      this.logger.info({ name, concurrency }, 'Worker initialized');
    }
  }

  async close() {
    this.logger.info('Closing workers...');
    
    await Promise.all(
      this.workers.map(worker => worker.close())
    );
    
    this.workers = [];
    this.logger.info('All workers closed');
  }
}