import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PromptRequest } from '@zemo/shared/dto';
import { PromptsService } from './prompts.service';

@ApiTags('prompts')
@Controller('prompts')
@UseGuards(ThrottlerGuard)
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all prompts' })
  @ApiResponse({ status: 200, description: 'Prompts retrieved successfully' })
  async getPrompts(@Query('active') active?: boolean) {
    return this.promptsService.getPrompts(active);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get prompt by key' })
  @ApiResponse({ status: 200, description: 'Prompt retrieved successfully' })
  async getPrompt(@Param('key') key: string, @Query('version') version?: number) {
    return this.promptsService.getPrompt(key, version);
  }

  @Post()
  @ApiOperation({ summary: 'Create new prompt' })
  @ApiResponse({ status: 201, description: 'Prompt created successfully' })
  async createPrompt(@Body() promptData: PromptRequest, @Request() req) {
    return this.promptsService.createPrompt(promptData, req.user?.id);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update prompt' })
  @ApiResponse({ status: 200, description: 'Prompt updated successfully' })
  async updatePrompt(@Param('key') key: string, @Body() updates: any, @Request() req) {
    return this.promptsService.updatePrompt(key, updates, req.user?.id);
  }

  @Post(':key/reset')
  @ApiOperation({ summary: 'Reset prompt to previous version' })
  @ApiResponse({ status: 200, description: 'Prompt reset successfully' })
  async resetPrompt(@Param('key') key: string, @Query('toVersion') toVersion: number) {
    return this.promptsService.resetPrompt(key, toVersion);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete prompt' })
  @ApiResponse({ status: 200, description: 'Prompt deleted successfully' })
  async deletePrompt(@Param('key') key: string) {
    return this.promptsService.deletePrompt(key);
  }
}