import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PurchaseEntryDto } from './dto/purchase-entry.dto';
import { AuditAdjustmentDto } from './dto/audit-adjustment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('purchase')
  @Roles(Role.ADMIN)
  async recordPurchase(
    @GetUser('storeId') storeId: string,
    @GetUser('id') userId: string,
    @Body() dto: PurchaseEntryDto,
  ) {
    const logs = await this.inventoryService.recordPurchase(storeId, userId, dto);
    return {
      success: true,
      message: 'Purchase entries recorded and stock updated successfully',
      data: logs,
    };
  }

  @Post('audit')
  @Roles(Role.ADMIN)
  async recordAudit(
    @GetUser('storeId') storeId: string,
    @GetUser('id') userId: string,
    @Body() dto: AuditAdjustmentDto,
  ) {
    const log = await this.inventoryService.recordAuditAdjustment(storeId, userId, dto);
    return {
      success: true,
      message: 'Stock audit adjustment applied successfully',
      data: log,
    };
  }

  @Get('history')
  @Roles(Role.ADMIN)
  async getHistory(@GetUser('storeId') storeId: string) {
    const history = await this.inventoryService.getTransactionHistory(storeId);
    return {
      success: true,
      data: history,
    };
  }

  @Get('low-stock')
  async getLowStock(@GetUser('storeId') storeId: string) {
    const lowStock = await this.inventoryService.getLowStockAlerts(storeId);
    return {
      success: true,
      data: lowStock,
    };
  }
}
