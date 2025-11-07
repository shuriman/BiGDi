import { createLogger } from '@zemo/shared/logger';
import { createPrismaClient } from '@zemo/shared/clients';
import OpenAI from 'openai';

export class EmbeddingService {
  private logger = createLogger('embedding-service');
  private prisma = createPrismaClient();
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateAndStore(
    text: string, 
    model: string = 'text-embedding-ada-002',
    metadata?: any
  ): Promise<string> {
    try {
      this.logger.debug({ textLength: text.length, model }, 'Generating embedding');

      // Check if embedding already exists
      const crypto = require('crypto');
      const textHash = crypto.createHash('sha256').update(text).digest('hex');

      const existingEmbedding = await this.prisma.embedding.findFirst({
        where: {
          textHash,
          model,
        },
      });

      if (existingEmbedding) {
        this.logger.debug({ textHash, model }, 'Using existing embedding');
        return existingEmbedding.id;
      }

      // Generate new embedding
      const embedding = await this.generateEmbedding(text, model);

      // Store in database
      const embeddingRecord = await this.prisma.embedding.create({
        data: {
          textHash,
          vector: embedding,
          model,
          metadata: metadata || {},
          pageId: metadata?.pageId,
          headingId: metadata?.headingId,
        },
      });

      this.logger.debug({ 
        embeddingId: embeddingRecord.id, 
        textHash, 
        model,
        vectorDimension: embedding.length 
      }, 'Embedding generated and stored');

      return embeddingRecord.id;

    } catch (error) {
      this.logger.error({ 
        textLength: text.length,
        model,
        error: error.message 
      }, 'Failed to generate and store embedding');
      throw error;
    }
  }

  async findSimilar(
    queryText: string,
    model: string = 'text-embedding-ada-002',
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<Array<{
    id: string;
    textHash: string;
    similarity: number;
    metadata?: any;
  }>> {
    try {
      this.logger.debug({ queryTextLength: queryText.length, model }, 'Finding similar embeddings');

      // Generate embedding for query text
      const queryEmbedding = await this.generateEmbedding(queryText, model);

      // Get all embeddings with the same model
      const embeddings = await this.prisma.embedding.findMany({
        where: { model },
        select: {
          id: true,
          textHash: true,
          vector: true,
          metadata: true,
        },
      });

      // Calculate cosine similarity
      const similarities = embeddings
        .map(embedding => ({
          id: embedding.id,
          textHash: embedding.textHash,
          similarity: this.cosineSimilarity(queryEmbedding, embedding.vector),
          metadata: embedding.metadata,
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      this.logger.debug({ 
        queryTextLength: queryText.length,
        totalEmbeddings: embeddings.length,
        foundSimilar: similarities.length 
      }, 'Similar embeddings found');

      return similarities;

    } catch (error) {
      this.logger.error({ 
        queryTextLength: queryText.length,
        model,
        error: error.message 
      }, 'Failed to find similar embeddings');
      throw error;
    }
  }

  private async generateEmbedding(text: string, model: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model,
      input: text,
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}