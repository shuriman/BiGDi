import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
@UseGuards(ThrottlerGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() settings: any) {
    return this.settingsService.updateSettings(settings);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Get all API keys' })
  async getApiKeys() {
    return this.settingsService.getApiKeys();
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Add new API key' })
  async addApiKey(@Body() apiKeyData: any) {
    return this.settingsService.addApiKey(apiKeyData);
  }

  @Put('api-keys/:id')
  @ApiOperation({ summary: 'Update API key' })
  async updateApiKey(@Param('id') id: string, @Body() updates: any) {
    return this.settingsService.updateApiKey(id, updates);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Delete API key' })
  async deleteApiKey(@Param('id') id: string) {
    return this.settingsService.deleteApiKey(id);
  }
}