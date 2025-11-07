import { Job } from 'bullmq';
import { BaseProcessor } from './base-processor';
import { PuppeteerScraper } from '../services/puppeteer-scraper';
import { PhpmorphyService } from '../services/phpmorphy-service';
import { JobStatus } from '@zemo/shared/domain';

export class ScrapeProcessor extends BaseProcessor {
  private scraper = new PuppeteerScraper();
  private phpmorphy = new PhpmorphyService();

  async process(job: Job): Promise<any> {
    const { jobId, urls, options } = job.data;
    
    await this.updateJobStatus(jobId, JobStatus.RUNNING);
    await this.logJobMessage(jobId, 'INFO', `Starting to scrape ${urls.length} URLs`, 'scraping');

    const results = [];
    
    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        await this.updateJobProgress(jobId, i, urls.length, `Scraping URL: ${url}`, 'scraping');

        try {
          // Check if already scraped and fresh
          const existingPage = await this.prisma.page.findUnique({
            where: { url },
          });

          if (existingPage && this.isContentFresh(existingPage.fetchedAt)) {
            await this.logJobMessage(jobId, 'INFO', `Using cached content for: ${url}`, 'cache');
            results.push(existingPage);
            continue;
          }

          // Scrape the page
          const pageData = await this.scraper.scrapePage(url, options);

          // Extract headings
          const headings = this.extractHeadings(pageData.content);

          // Generate content hash for deduplication
          const crypto = require('crypto');
          const contentHash = crypto.createHash('sha256').update(pageData.content).digest('hex');

          // Store in database
          const page = await this.prisma.page.create({
            data: {
              url,
              title: pageData.title,
              description: pageData.description,
              content: pageData.content,
              contentHash,
              language: pageData.language,
              jobId,
            },
          });

          // Store headings
          if (headings.length > 0) {
            await this.prisma.heading.createMany({
              data: headings.map((heading, index) => ({
                pageId: page.id,
                level: heading.level,
                text: heading.text,
                order: index,
              })),
            });

            await this.logJobMessage(jobId, 'INFO', `Extracted ${headings.length} headings from: ${url}`, 'extraction');
          }

          results.push(page);
          await this.logJobMessage(jobId, 'INFO', `Successfully scraped: ${url}`, 'success');

        } catch (error) {
          await this.logJobMessage(jobId, 'ERROR', `Failed to scrape ${url}: ${error.message}`, 'error');
          // Continue with other URLs
        }
      }

      await this.updateJobProgress(jobId, urls.length, urls.length, 'Scraping completed');
      await this.updateJobStatus(jobId, JobStatus.COMPLETED, {
        result: {
          pages: results.length,
          urls: results.map(p => p.url),
        },
      });

      this.logger.info({ jobId, pagesScraped: results.length }, 'Scraping job completed');

      return {
        pagesScraped: results.length,
        results,
      };

    } catch (error) {
      await this.logJobMessage(jobId, 'ERROR', `Scraping job failed: ${error.message}`, 'error');
      await this.updateJobStatus(jobId, JobStatus.FAILED, {
        error: error.message,
      });
      throw error;
    }
  }

  private extractHeadings(content: string): Array<{ level: number; text: string }> {
    const headings = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, '').trim(),
      });
    }

    return headings;
  }

  private isContentFresh(fetchedAt: Date): boolean {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Date.now() - fetchedAt.getTime() < maxAge;
  }
}