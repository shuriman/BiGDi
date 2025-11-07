import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor';
import { LLMService } from '../services/llm-service';
import { PromptService } from '../services/prompt-service';
import { JobStatus } from '@zemo/shared/domain';

export class GenerateProcessor extends BaseProcessor {
  private llmService = new LLMService();
  private promptService = new PromptService();

  async process(job: Job): Promise<any> {
    const { jobId, type, inputs, options } = job.data;
    
    await this.updateJobStatus(jobId, JobStatus.RUNNING);
    await this.logJobMessage(jobId, 'INFO', `Starting content generation for type: ${type}`, 'generation');

    try {
      // Get the appropriate prompt
      const prompt = await this.promptService.getPrompt(type, options?.promptVersion);
      
      if (!prompt) {
        throw new Error(`No prompt found for type: ${type}`);
      }

      await this.updateJobProgress(jobId, 1, 4, 'Preparing prompt with inputs');

      // Prepare the prompt with inputs
      const preparedPrompt = this.preparePrompt(prompt.body, inputs, options);

      await this.updateJobProgress(jobId, 2, 4, 'Generating content with LLM');

      // Generate content using LLM
      const provider = options?.provider || 'openai';
      const result = await this.llmService.generateContent(preparedPrompt, {
        provider,
        model: options?.model,
        maxTokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      });

      await this.updateJobProgress(jobId, 3, 4, 'Processing and storing generated content');

      // Store generated content
      const generatedText = await this.prisma.generatedText.create({
        data: {
          sectionType: type,
          heading: inputs.heading || 'Generated Content',
          content: result.content,
          keywordsUsed: inputs.keywords || [],
          language: options?.language || 'en',
          metrics: {
            provider,
            model: result.model,
            tokensUsed: result.tokensUsed,
            cost: result.cost,
            duration: result.duration,
          },
          status: 'completed',
        },
      });

      await this.updateJobProgress(jobId, 4, 4, 'Content generation completed');
      await this.updateJobStatus(jobId, JobStatus.COMPLETED, {
        result: {
          generatedTextId: generatedText.id,
          content: result.content,
          metrics: result,
        },
      });

      this.logger.info({ 
        jobId, 
        type, 
        generatedTextId: generatedText.id,
        tokensUsed: result.tokensUsed 
      }, 'Content generation completed');

      return {
        generatedTextId: generatedText.id,
        content: result.content,
        metrics: result,
      };

    } catch (error) {
      await this.logJobMessage(jobId, 'ERROR', `Content generation failed: ${error.message}`, 'error');
      await this.updateJobStatus(jobId, JobStatus.FAILED, {
        error: error.message,
      });
      throw error;
    }
  }

  private preparePrompt(promptTemplate: string, inputs: any, options?: any): string {
    let prompt = promptTemplate;

    // Replace common placeholders
    if (inputs.heading) {
      prompt = prompt.replace(/\{\{heading\}\}/g, inputs.heading);
    }
    
    if (inputs.keywords && Array.isArray(inputs.keywords)) {
      prompt = prompt.replace(/\{\{keywords\}\}/g, inputs.keywords.join(', '));
    }

    if (inputs.context) {
      prompt = prompt.replace(/\{\{context\}\}/g, inputs.context);
    }

    if (inputs.tone) {
      prompt = prompt.replace(/\{\{tone\}\}/g, inputs.tone);
    }

    // Replace any other custom placeholders
    Object.keys(inputs).forEach(key => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(placeholder, inputs[key]);
    });

    return prompt;
  }
}