import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor';
import { JobType, JobStatus } from '@zemo/shared/domain';

export class PipelineProcessor extends BaseProcessor {
  async process(job: Job): Promise<any> {
    const { jobId, pipeline } = job.data;
    
    await this.updateJobStatus(jobId, JobStatus.RUNNING);
    await this.logJobMessage(jobId, 'INFO', `Starting pipeline with ${pipeline.steps.length} steps`, 'pipeline');

    try {
      const results = {};
      
      for (let i = 0; i < pipeline.steps.length; i++) {
        const step = pipeline.steps[i];
        await this.updateJobProgress(jobId, i, pipeline.steps.length, `Executing step: ${step.type}`, step.type);

        // Create a sub-job for each step
        const subJobData = {
          ...step.params,
          // Pass results from previous steps
          ...(results as any),
        };

        // Execute the step based on type
        const stepResult = await this.executeStep(step.type, subJobData, jobId);
        results[step.type] = stepResult;

        await this.logJobMessage(jobId, 'INFO', `Step ${step.type} completed`, step.type);
      }

      await this.updateJobProgress(jobId, pipeline.steps.length, pipeline.steps.length, 'Pipeline completed');
      await this.updateJobStatus(jobId, JobStatus.COMPLETED, {
        result: results,
      });

      this.logger.info({ jobId, stepsCompleted: pipeline.steps.length }, 'Pipeline completed successfully');

      return results;

    } catch (error) {
      await this.logJobMessage(jobId, 'ERROR', `Pipeline failed: ${error.message}`, 'error');
      await this.updateJobStatus(jobId, JobStatus.FAILED, {
        error: error.message,
      });
      throw error;
    }
  }

  private async executeStep(stepType: string, data: any, parentJobId: string): Promise<any> {
    switch (stepType) {
      case 'serpapi':
        return await this.executeSerpApiStep(data, parentJobId);
      
      case 'scrape':
        return await this.executeScrapeStep(data, parentJobId);
      
      case 'analyze':
        return await this.executeAnalyzeStep(data, parentJobId);
      
      case 'generate':
        return await this.executeGenerateStep(data, parentJobId);
      
      default:
        throw new Error(`Unknown pipeline step type: ${stepType}`);
    }
  }

  private async executeSerpApiStep(data: any, parentJobId: string): Promise<any> {
    // Import dynamically to avoid circular dependencies
    const { SerpApiProcessor } = await import('./serpapi-processor');
    const processor = new SerpApiProcessor();
    
    const mockJob = { data, id: `${parentJobId}-serpapi` } as Job;
    return processor.process(mockJob);
  }

  private async executeScrapeStep(data: any, parentJobId: string): Promise<any> {
    const { ScrapeProcessor } = await import('./scrape-processor');
    const processor = new ScrapeProcessor();
    
    const mockJob = { data, id: `${parentJobId}-scrape` } as Job;
    return processor.process(mockJob);
  }

  private async executeAnalyzeStep(data: any, parentJobId: string): Promise<any> {
    const { AnalyzeProcessor } = await import('./analyze-processor');
    const processor = new AnalyzeProcessor();
    
    const mockJob = { data, id: `${parentJobId}-analyze` } as Job;
    return processor.process(mockJob);
  }

  private async executeGenerateStep(data: any, parentJobId: string): Promise<any> {
    const { GenerateProcessor } = await import('./generate-processor');
    const processor = new GenerateProcessor();
    
    const mockJob = { data, id: `${parentJobId}-generate` } as Job;
    return processor.process(mockJob);
  }
}