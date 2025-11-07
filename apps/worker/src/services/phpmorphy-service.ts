import { createLogger } from '@zemo/shared/logger';
import axios from 'axios';

export class PhpmorphyService {
  private logger = createLogger('phpmorphy-service');
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PHP_MORPHY_URL || 'http://phpmorphy:8080';
  }

  async lemmatize(text: string, language: string = 'ru'): Promise<string[]> {
    try {
      this.logger.debug({ textLength: text.length, language }, 'Lemmatizing text');

      const response = await axios.post(`${this.baseUrl}/lemmatize`, {
        text,
        language,
      }, {
        timeout: 30000,
      });

      if (response.data.error) {
        throw new Error(`Phpmorphy error: ${response.data.error}`);
      }

      return response.data.lemmas || [];

    } catch (error) {
      this.logger.error({ 
        textLength: text.length,
        language,
        error: error.message 
      }, 'Failed to lemmatize text');
      throw error;
    }
  }

  async lemmatizeAndAnalyze(text: string, language: string = 'ru'): Promise<{
    lemmas: string[];
    words: Array<{ word: string; lemma: string; frequency: number }>;
    wordCount: number;
    uniqueWords: number;
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/analyze`, {
        text,
        language,
      }, {
        timeout: 30000,
      });

      if (response.data.error) {
        throw new Error(`Phpmorphy error: ${response.data.error}`);
      }

      return {
        lemmas: response.data.lemmas || [],
        words: response.data.words || [],
        wordCount: response.data.wordCount || 0,
        uniqueWords: response.data.uniqueWords || 0,
      };

    } catch (error) {
      this.logger.error({ 
        textLength: text.length,
        language,
        error: error.message 
      }, 'Failed to analyze text');
      throw error;
    }
  }

  async getWordForms(word: string, language: string = 'ru'): Promise<{
    lemma: string;
    forms: string[];
    partOfSpeech: string;
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/forms`, {
        word,
        language,
      }, {
        timeout: 10000,
      });

      if (response.data.error) {
        throw new Error(`Phpmorphy error: ${response.data.error}`);
      }

      return {
        lemma: response.data.lemma || word,
        forms: response.data.forms || [],
        partOfSpeech: response.data.partOfSpeech || 'unknown',
      };

    } catch (error) {
      this.logger.error({ 
        word,
        language,
        error: error.message 
      }, 'Failed to get word forms');
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error({ error: error.message }, 'Phpmorphy health check failed');
      return false;
    }
  }
}