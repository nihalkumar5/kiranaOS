import { Controller, Get, Put, Body, UseGuards, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public/:storeId')
  async getPublicSettings(@Param('storeId') storeId: string) {
    const settings = await this.settingsService.getSettings(storeId);
    return { success: true, data: settings };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSettings(@GetUser('storeId') storeId: string) {
    const settings = await this.settingsService.getSettings(storeId);
    return { success: true, data: settings };
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @GetUser('storeId') storeId: string,
    @Body() updateData: any,
  ) {
    const settings = await this.settingsService.updateSettings(storeId, updateData);
    return { success: true, data: settings };
  }
}
