import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor';
import { PhpmorphyService } from '../services/phpmorphy-service';
import { EmbeddingService } from '../services/embedding-service';
import { JobStatus } from '@zemo/shared/domain';

export class AnalyzeProcessor extends BaseProcessor {
  private phpmorphy = new PhpmorphyService();
  private embeddingService = new EmbeddingService();

  async process(job: Job): Promise<any> {
    const { jobId, pageIds, options } = job.data;
    
    await this.updateJobStatus(jobId, JobStatus.RUNNING);
    await this.logJobMessage(jobId, 'INFO', `Starting analysis for ${pageIds.length} pages`, 'analysis');

    try {
      const results = [];

      for (let i = 0; i < pageIds.length; i++) {
        const pageId = pageIds[i];
        await this.updateJobProgress(jobId, i, pageIds.length, `Analyzing page ${i + 1}/${pageIds.length}`, 'analysis');

        // Get page with headings
        const page = await this.prisma.page.findUnique({
          where: { id: pageId },
          include: {
            headings: true,
          },
        });

        if (!page) {
          await this.logJobMessage(jobId, 'WARN', `Page ${pageId} not found`, 'warning');
          continue;
        }

        // Analyze content with phpmorphy
        const analysis = await this.analyzePageContent(page);

        // Generate embeddings for headings and content
        await this.generateEmbeddings(page);

        results.push({
          pageId: page.id,
          url: page.url,
          analysis,
        });

        await this.logJobMessage(jobId, 'INFO', `Analysis completed for: ${page.url}`, 'success');
      }

      await this.updateJobProgress(jobId, pageIds.length, pageIds.length, 'Analysis completed');
      await this.updateJobStatus(jobId, JobStatus.COMPLETED, {
        result: {
          pagesAnalyzed: results.length,
          results,
        },
      });

      this.logger.info({ jobId, pagesAnalyzed: results.length }, 'Analysis job completed');

      return {
        pagesAnalyzed: results.length,
        results,
      };

    } catch (error) {
      await this.logJobMessage(jobId, 'ERROR', `Analysis job failed: ${error.message}`, 'error');
      await this.updateJobStatus(jobId, JobStatus.FAILED, {
        error: error.message,
      });
      throw error;
    }
  }

  private async analyzePageContent(page: any) {
    const text = `${page.title} ${page.description} ${page.content}`;
    
    // Get lemmatized words and frequencies
    const lemmatized = await this.phpmorphy.lemmatizeAndAnalyze(text);
    
    // Extract keywords (most frequent meaningful words)
    const keywords = this.extractKeywords(lemmatized.words, 20);
    
    // Calculate readability metrics
    const readability = this.calculateReadability(text);
    
    // Extract key phrases (based on headings)
    const keyPhrases = page.headings.map((h: any) => h.text);

    return {
      wordCount: lemmatized.wordCount,
      uniqueWords: lemmatized.uniqueWords,
      keywords,
      readability,
      keyPhrases,
      language: page.language || 'unknown',
    };
  }

  private async generateEmbeddings(page: any) {
    const model = 'text-embedding-ada-002'; // Default model
    
    // Generate embedding for page content
    const contentText = `${page.title} ${page.description}`;
    if (contentText.trim()) {
      await this.embeddingService.generateAndStore(contentText, model, {
        pageId: page.id,
        type: 'page_content',
      });
    }

    // Generate embeddings for headings
    for (const heading of page.headings) {
      if (heading.text.trim()) {
        await this.embeddingService.generateAndStore(heading.text, model, {
          pageId: page.id,
          headingId: heading.id,
          type: 'heading',
          level: heading.level,
        });
      }
    }
  }

  private extractKeywords(words: Array<{ word: string; frequency: number }>, limit: number) {
    return words
      .filter(w => w.word.length > 3 && w.frequency > 1) // Filter short and rare words
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(w => ({
        word: w.word,
        frequency: w.frequency,
      }));
  }

  private calculateReadability(text: string) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = text.replace(/\s/g, '').length / words.length;
    
    // Simple readability score (lower is easier to read)
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (avgCharsPerWord / 4.7));
    
    return {
      sentences: sentences.length,
      words: words.length,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgCharsPerWord: Math.round(avgCharsPerWord * 10) / 10,
      fleschScore: Math.round(fleschScore * 10) / 10,
      difficulty: this.getDifficultyLevel(fleschScore),
    };
  }

  private getDifficultyLevel(score: number): string {
    if (score >= 90) return 'very_easy';
    if (score >= 80) return 'easy';
    if (score >= 70) return 'fairly_easy';
    if (score >= 60) return 'standard';
    if (score >= 50) return 'fairly_difficult';
    if (score >= 30) return 'difficult';
    return 'very_difficult';
  }
}