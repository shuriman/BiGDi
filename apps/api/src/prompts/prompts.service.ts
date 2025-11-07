import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PromptRequest } from '@zemo/shared/dto';
import { createPrismaClient } from '@zemo/shared/clients';
import { createLogger } from '@zemo/shared/logger';

@Injectable()
export class PromptsService {
  private prisma = createPrismaClient();
  private logger = createLogger('prompts-service');

  async getPrompts(active?: boolean) {
    const where = active !== undefined ? { isActive: active } : {};
    
    const prompts = await this.prisma.prompt.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return prompts;
  }

  async getPrompt(key: string, version?: number) {
    const where: any = { key };
    
    if (version) {
      where.version = version;
    } else {
      // Get the latest version
      where.isActive = true;
    }

    const prompt = await this.prisma.prompt.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with key ${key} not found`);
    }

    return prompt;
  }

  async createPrompt(promptData: PromptRequest, userId?: string) {
    this.logger.info({ key: promptData.key }, 'Creating new prompt');

    // Check if prompt with this key already exists
    const existingPrompt = await this.prisma.prompt.findFirst({
      where: { key: promptData.key },
    });

    if (existingPrompt) {
      throw new BadRequestException(`Prompt with key ${promptData.key} already exists`);
    }

    const prompt = await this.prisma.prompt.create({
      data: {
        key: promptData.key,
        body: promptData.body,
        version: promptData.version || 1,
        updatedBy: userId || 'system',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    this.logger.info({ id: prompt.id, key: prompt.key }, 'Prompt created successfully');

    return prompt;
  }

  async updatePrompt(key: string, updates: any, userId: string) {
    this.logger.info({ key }, 'Updating prompt');

    const existingPrompt = await this.prisma.prompt.findFirst({
      where: { key, isActive: true },
    });

    if (!existingPrompt) {
      throw new NotFoundException(`Prompt with key ${key} not found`);
    }

    // Create new version if body is being updated
    if (updates.body && updates.body !== existingPrompt.body) {
      // Deactivate current version
      await this.prisma.prompt.update({
        where: { id: existingPrompt.id },
        data: { isActive: false },
      });

      // Create new version
      const newPrompt = await this.prisma.prompt.create({
        data: {
          key,
          body: updates.body,
          version: existingPrompt.version + 1,
          updatedBy: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      this.logger.info({ 
        id: newPrompt.id, 
        key: newPrompt.key, 
        version: newPrompt.version 
      }, 'New prompt version created');

      return newPrompt;
    } else {
      // Update metadata only
      const updatedPrompt = await this.prisma.prompt.update({
        where: { id: existingPrompt.id },
        data: {
          ...updates,
          updatedBy: userId || 'system',
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return updatedPrompt;
    }
  }

  async resetPrompt(key: string, toVersion: number) {
    this.logger.info({ key, toVersion }, 'Resetting prompt to version');

    const targetPrompt = await this.prisma.prompt.findFirst({
      where: { key, version: toVersion },
    });

    if (!targetPrompt) {
      throw new NotFoundException(`Prompt ${key} version ${toVersion} not found`);
    }

    // Deactivate current active version
    await this.prisma.prompt.updateMany({
      where: { key, isActive: true },
      data: { isActive: false },
    });

    // Activate target version
    const resetPrompt = await this.prisma.prompt.update({
      where: { id: targetPrompt.id },
      data: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    this.logger.info({ 
      id: resetPrompt.id, 
      key: resetPrompt.key, 
      version: resetPrompt.version 
    }, 'Prompt reset successfully');

    return resetPrompt;
  }

  async deletePrompt(key: string) {
    this.logger.info({ key }, 'Deleting prompt');

    const prompt = await this.prisma.prompt.findFirst({
      where: { key },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with key ${key} not found`);
    }

    // Soft delete by deactivating all versions
    await this.prisma.prompt.updateMany({
      where: { key },
      data: { isActive: false },
    });

    return { message: 'Prompt deleted successfully' };
  }
}