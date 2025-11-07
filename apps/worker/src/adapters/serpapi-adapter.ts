import { createLogger } from '@zemo/shared/logger';
import axios from 'axios';

export class SerpApiAdapter {
  private logger = createLogger('serpapi-adapter');
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('SERPAPI_KEY not found in environment variables');
    }
  }

  async search(keyword: string, params: any = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('SerpApi API key not configured');
    }

    const searchParams = {
      api_key: this.apiKey,
      q: keyword,
      engine: params.engine || 'google',
      location: params.location || 'United States',
      google_domain: params.googleDomain || 'google.com',
      gl: params.gl || 'us',
      hl: params.hl || 'en',
      num: params.num || 10,
      safe: params.safe || 'off',
      ...params.custom,
    };

    try {
      this.logger.info({ keyword, params: searchParams }, 'Making SerpApi request');

      const response = await axios.get(this.baseUrl, {
        params: searchParams,
        timeout: 30000, // 30 seconds timeout
      });

      if (response.data.error) {
        throw new Error(`SerpApi error: ${response.data.error}`);
      }

      this.logger.info({ 
        keyword, 
        resultsCount: response.data.organic_results?.length || 0,
        searchInformation: response.data.search_information 
      }, 'SerpApi request successful');

      return response.data;

    } catch (error) {
      this.logger.error({ 
        keyword, 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data 
      }, 'SerpApi request failed');

      if (error.response?.status === 429) {
        throw new Error('SerpApi rate limit exceeded. Please try again later.');
      }

      throw error;
    }
  }

  async searchWithRetry(keyword: string, params: any = {}, maxRetries: number = 3): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.search(keyword, params);
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn({ 
            keyword, 
            attempt, 
            maxRetries, 
            delay,
            error: error.message 
          }, `SerpApi request failed, retrying in ${delay}ms`);

          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}