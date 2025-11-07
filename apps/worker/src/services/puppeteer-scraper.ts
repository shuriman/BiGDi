import { createLogger } from '@zemo/shared/logger';
import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';

export class PuppeteerScraper {
  private logger = createLogger('puppeteer-scraper');
  private browser: Browser | null = null;
  private maxConcurrency: number;
  private activePages = 0;

  constructor() {
    this.maxConcurrency = parseInt(process.env.PUPPETEER_MAX_CONCURRENCY) || 2;
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production' ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        timeout: 30000,
      });

      this.logger.info('Puppeteer browser initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize Puppeteer browser');
      throw error;
    }
  }

  async scrapePage(url: string, options: any = {}): Promise<any> {
    await this.waitForConcurrencySlot();
    
    let page: Page | null = null;
    
    try {
      if (!this.browser) {
        await this.initialize();
      }

      page = await this.browser!.newPage();
      
      // Set user agent
      await page.setUserAgent(options.userAgent || 
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Set timeout
      page.setDefaultTimeout(options.timeout || 30000);

      // Navigate to URL
      this.logger.info({ url }, 'Navigating to page');
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: options.timeout || 30000,
      });

      // Extract content
      const content = await page.evaluate(() => {
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          content: document.body?.innerText || '',
          language: document.documentElement.lang || 'en',
          keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
        };
      });

      // Detect language using simple heuristics or external service
      const detectedLanguage = await this.detectLanguage(content.content);

      this.logger.info({ 
        url, 
        title: content.title,
        contentLength: content.content.length,
        language: detectedLanguage 
      }, 'Page scraped successfully');

      return {
        url,
        title: content.title,
        description: content.description,
        content: content.content,
        language: detectedLanguage,
        keywords: content.keywords,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error({ url, error: error.message }, 'Failed to scrape page');
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
      this.activePages--;
    }
  }

  async scrapeMultiplePages(urls: string[], options: any = {}): Promise<any[]> {
    const results = [];
    const concurrency = Math.min(this.maxConcurrency, urls.length);

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => 
        this.scrapePage(url, options).catch(error => ({
          url,
          error: error.message,
          failed: true,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private async waitForConcurrencySlot(): Promise<void> {
    while (this.activePages >= this.maxConcurrency) {
      await this.sleep(1000);
    }
    this.activePages++;
  }

  private async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on common words
    // In production, you might want to use a proper language detection library
    const sample = text.substring(0, 1000).toLowerCase();
    
    // Check for common English words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const englishCount = englishWords.filter(word => sample.includes(word)).length;
    
    // Check for common Russian words
    const russianWords = ['и', 'в', 'на', 'с', 'по', 'к', 'от', 'для', 'без', 'через', 'под', 'из'];
    const russianCount = russianWords.filter(word => sample.includes(word)).length;
    
    if (englishCount > russianCount) {
      return 'en';
    } else if (russianCount > 0) {
      return 'ru';
    }
    
    return 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.info('Puppeteer browser closed');
    }
  }
}