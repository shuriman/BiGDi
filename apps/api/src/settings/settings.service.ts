import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiKeyRequest } from '@zemo/shared/dto';
import { createPrismaClient } from '@zemo/shared/clients';
import { createLogger } from '@zemo/shared/logger';
import { encrypt, hashApiKey } from '@zemo/shared/crypto';

@Injectable()
export class SettingsService {
  private prisma = createPrismaClient();
  private logger = createLogger('settings-service');

  async getSettings() {
    // This would typically fetch from a settings table or env vars
    return {
      maxConcurrentJobs: {
        serpapi: parseInt(process.env.JOBS_CONCURRENCY_SERP) || 3,
        scrape: parseInt(process.env.JOBS_CONCURRENCY_SCRAPE) || 2,
        analyze: parseInt(process.env.JOBS_CONCURRENCY_ANALYZE) || 4,
        generate: parseInt(process.env.JOBS_CONCURRENCY_GENERATE) || 2,
      },
      rateLimits: {
        externalApi: {
          requestsPerMinute: 60,
          burstLimit: 10,
        },
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        structured: true,
      },
    };
  }

  async updateSettings(settings: any) {
    this.logger.info({ settings }, 'Updating settings');
    
    // In a real implementation, this would update a settings table
    // For now, we'll just validate and return the input
    return settings;
  }

  async getApiKeys() {
    const apiKeys = await this.prisma.apiKey.findMany({
      select: {
        id: true,
        provider: true,
        metadata: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Never return the encrypted value
      },
    });

    return apiKeys;
  }

  async addApiKey(apiKeyData: ApiKeyRequest, userId?: string) {
    this.logger.info({ provider: apiKeyData.provider }, 'Adding new API key');

    // Check if key already exists for this provider
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        provider: apiKeyData.provider,
        isActive: true,
      },
    });

    if (existingKey) {
      throw new BadRequestException(`API key for ${apiKeyData.provider} already exists`);
    }

    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const encryptedValue = encrypt(apiKeyData.value, encryptionKey);
    const keyHash = hashApiKey(apiKeyData.value);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        provider: apiKeyData.provider,
        encryptedValue,
        metadata: apiKeyData.metadata || {},
        createdBy: userId || 'system',
      },
    });

    this.logger.info({ id: apiKey.id, provider: apiKey.provider }, 'API key created successfully');

    // Return without the encrypted value
    return {
      id: apiKey.id,
      provider: apiKey.provider,
      metadata: apiKey.metadata,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    };
  }

  async updateApiKey(id: string, updates: any, userId?: string) {
    this.logger.info({ id }, 'Updating API key');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    const updatedApiKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        ...updates,
        updatedBy: userId || 'system',
        // Don't allow updating the encrypted value directly
        encryptedValue: updates.value ? 
          encrypt(updates.value, process.env.ENCRYPTION_KEY || 'default-key') : 
          undefined,
      },
    });

    // Return without the encrypted value
    return {
      id: updatedApiKey.id,
      provider: updatedApiKey.provider,
      metadata: updatedApiKey.metadata,
      isActive: updatedApiKey.isActive,
      createdAt: updatedApiKey.createdAt,
      updatedAt: updatedApiKey.updatedAt,
    };
  }

  async deleteApiKey(id: string) {
    this.logger.info({ id }, 'Deleting API key');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Soft delete by deactivating
    await this.prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return { message: 'API key deactivated successfully' };
  }
}