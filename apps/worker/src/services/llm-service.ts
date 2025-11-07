import { createLogger } from '@zemo/shared/logger';
import { createPrismaClient } from '@zemo/shared/clients';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleAuth } from 'google-auth-library';

export class LLMService {
  private logger = createLogger('llm-service');
  private prisma = createPrismaClient();
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateContent(prompt: string, options: {
    provider?: 'openai' | 'claude' | 'gemini';
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
    cost: number;
    duration: number;
  }> {
    const startTime = Date.now();
    const provider = options.provider || 'openai';
    
    this.logger.info({ provider, model: options.model }, 'Generating content with LLM');

    try {
      let result;

      switch (provider) {
        case 'openai':
          result = await this.generateWithOpenAI(prompt, options);
          break;
        case 'claude':
          result = await this.generateWithClaude(prompt, options);
          break;
        case 'gemini':
          result = await this.generateWithGemini(prompt, options);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }

      const duration = Date.now() - startTime;
      
      this.logger.info({ 
        provider, 
        model: result.model,
        tokensUsed: result.tokensUsed,
        duration 
      }, 'Content generated successfully');

      return {
        ...result,
        duration,
      };

    } catch (error) {
      this.logger.error({ 
        provider, 
        error: error.message,
        duration: Date.now() - startTime 
      }, 'Failed to generate content');
      throw error;
    }
  }

  private async generateWithOpenAI(prompt: string, options: any): Promise<any> {
    const model = options.model || 'gpt-3.5-turbo';
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature || 0.7;

    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = this.calculateOpenAICost(model, tokensUsed);

    return {
      content,
      model,
      tokensUsed,
      cost,
    };
  }

  private async generateWithClaude(prompt: string, options: any): Promise<any> {
    const model = options.model || 'claude-3-sonnet-20240229';
    const maxTokens = options.maxTokens || 1000;

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;
    const cost = this.calculateClaudeCost(model, tokensUsed);

    return {
      content,
      model,
      tokensUsed,
      cost,
    };
  }

  private async generateWithGemini(prompt: string, options: any): Promise<any> {
    const model = options.model || 'gemini-pro';
    
    // Note: This is a simplified implementation
    // In production, you'd want to use the official Google AI SDK
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = this.estimateTokenCount(content); // Gemini doesn't provide exact counts
    const cost = this.calculateGeminiCost(model, tokensUsed);

    return {
      content,
      model,
      tokensUsed,
      cost,
    };
  }

  private calculateOpenAICost(model: string, tokens: number): number {
    const pricing = {
      'gpt-3.5-turbo': 0.002 / 1000,
      'gpt-4': 0.03 / 1000,
      'gpt-4-turbo': 0.01 / 1000,
    };
    
    return (pricing[model as keyof typeof pricing] || 0.002 / 1000) * tokens;
  }

  private calculateClaudeCost(model: string, tokens: number): number {
    const pricing = {
      'claude-3-sonnet-20240229': 0.015 / 1000,
      'claude-3-opus-20240229': 0.075 / 1000,
      'claude-3-haiku-20240307': 0.00025 / 1000,
    };
    
    return (pricing[model as keyof typeof pricing] || 0.015 / 1000) * tokens;
  }

  private calculateGeminiCost(model: string, tokens: number): number {
    const pricing = {
      'gemini-pro': 0.0005 / 1000,
      'gemini-pro-vision': 0.0025 / 1000,
    };
    
    return (pricing[model as keyof typeof pricing] || 0.0005 / 1000) * tokens;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}