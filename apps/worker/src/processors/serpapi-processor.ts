import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor';
import { SerpApiAdapter } from '../adapters/serpapi-adapter';
import { JobStatus } from '@zemo/shared/domain';

export class SerpApiProcessor extends BaseProcessor {
  private serpApiAdapter = new SerpApiAdapter();

  async process(job: Job): Promise<any> {
    const { jobId, keyword, params } = job.data;
    
    await this.updateJobStatus(jobId, JobStatus.RUNNING);
    await this.logJobMessage(jobId, 'INFO', `Starting SerpApi search for keyword: ${keyword}`, 'search');

    try {
      // Check if we already have this result cached
      const existingResult = await this.prisma.serpApiResult.findFirst({
        where: {
          keyword,
          params,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingResult && this.isResultFresh(existingResult.createdAt)) {
        await this.logJobMessage(jobId, 'INFO', 'Using cached SerpApi result', 'cache');
        await this.updateJobStatus(jobId, JobStatus.COMPLETED, {
          result: existingResult.rawJson,
        });
        return existingResult.rawJson;
      }

      await this.updateJobProgress(jobId, 1, 3, 'Fetching data from SerpApi');

      // Fetch from SerpApi
      const result = await this.serpApiAdapter.search(keyword, params);

      await this.updateJobProgress(jobId, 2, 3, 'Processing and storing results');

      // Store result in database
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(JSON.stringify({ keyword, params, result })).digest('hex');

      const serpApiResult = await this.prisma.serpApiResult.create({
        data: {
          keyword,
          params,
          rawJson: result,
          hash,
          jobId,
        },
      });

      await this.updateJobProgress(jobId, 3, 3, 'SerpApi search completed');
      await this.updateJobStatus(jobId, JobStatus.COMPLETED, {
        result: serpApiResult.rawJson,
      });

      this.logger.info({ jobId, keyword, resultsCount: result.organic_results?.length || 0 }, 'SerpApi search completed');

      return result;

    } catch (error) {
      await this.logJobMessage(jobId, 'ERROR', `SerpApi search failed: ${error.message}`, 'error');
      await this.updateJobStatus(jobId, JobStatus.FAILED, {
        error: error.message,
      });
      throw error;
    }
  }

  private isResultFresh(createdAt: Date): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - createdAt.getTime() < maxAge;
  }
}