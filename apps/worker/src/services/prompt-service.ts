import { createLogger } from '@zemo/shared/logger';
import { createPrismaClient } from '@zemo/shared/clients';

export class PromptService {
  private logger = createLogger('prompt-service');
  private prisma = createPrismaClient();

  async getPrompt(key: string, version?: number): Promise<{
    id: string;
    key: string;
    body: string;
    version: number;
  } | null> {
    try {
      const where: any = { key };
      
      if (version) {
        where.version = version;
      } else {
        where.isActive = true;
      }

      const prompt = await this.prisma.prompt.findFirst({
        where,
        orderBy: { version: 'desc' },
      });

      if (!prompt) {
        this.logger.warn({ key, version }, 'Prompt not found');
        return null;
      }

      return {
        id: prompt.id,
        key: prompt.key,
        body: prompt.body,
        version: prompt.version,
      };

    } catch (error) {
      this.logger.error({ key, version, error: error.message }, 'Failed to get prompt');
      throw error;
    }
  }

  async listPrompts(activeOnly: boolean = true): Promise<Array<{
    id: string;
    key: string;
    version: number;
    isActive: boolean;
    updatedAt: Date;
  }>> {
    try {
      const prompts = await this.prisma.prompt.findMany({
        where: activeOnly ? { isActive: true } : {},
        select: {
          id: true,
          key: true,
          version: true,
          isActive: true,
          updatedAt: true,
        },
        orderBy: [
          { key: 'asc' },
          { version: 'desc' },
        ],
      });

      return prompts;

    } catch (error) {
      this.logger.error({ activeOnly, error: error.message }, 'Failed to list prompts');
      throw error;
    }
  }

  async renderPrompt(key: string, variables: Record<string, any>, version?: number): Promise<string> {
    const prompt = await this.getPrompt(key, version);
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${key}${version ? ` (version ${version})` : ''}`);
    }

    let rendered = prompt.body;

    // Replace variables in the prompt
    Object.entries(variables).forEach(([varName, value]) => {
      const placeholder = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    });

    // Handle conditional blocks {{#if variable}} ... {{/if}}
    rendered = this.renderConditionals(rendered, variables);

    // Handle loops {{#each array}} ... {{/each}}
    rendered = this.renderLoops(rendered, variables);

    return rendered;
  }

  private renderConditionals(template: string, variables: Record<string, any>): string {
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(ifRegex, (match, varName, content) => {
      const value = variables[varName];
      return (value && value !== false && value !== 0 && value !== '') ? content : '';
    });
  }

  private renderLoops(template: string, variables: Record<string, any>): string {
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(eachRegex, (match, varName, content) => {
      const array = variables[varName];
      
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        let itemContent = content;
        
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([key, value]) => {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(placeholder, String(value));
          });
        } else {
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        }
        
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
        
        return itemContent;
      }).join('');
    });
  }
}