import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OnlineOrdersService } from './online-orders.service';
import { UpdateOnlineOrderStatusDto } from './dto/update-online-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('online-orders')
export class OnlineOrdersController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  // ==========================================
  // ADMIN DASHBOARD ENDPOINTS (JWT REQUIRED)
  // ==========================================

  @Get()
  @UseGuards(JwtAuthGuard)
  async getOnlineOrders(@GetUser('storeId') storeId: string) {
    const orders = await this.onlineOrdersService.findAll(storeId);
    return {
      success: true,
      data: orders,
    };
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @GetUser('storeId') storeId: string,
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOnlineOrderStatusDto,
  ) {
    const order = await this.onlineOrdersService.updateStatus(storeId, userId, id, dto.status);
    return {
      success: true,
      message: `Order status updated to ${dto.status}`,
      data: order,
    };
  }
}
