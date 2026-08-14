import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { OnlineOrdersService } from './online-orders.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';

@Controller('store')
export class PublicStoreController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Get(':storeId/products')
  async getPublicProducts(@Param('storeId') storeId: string) {
    const products = await this.onlineOrdersService.getPublicStoreProducts(storeId);
    return { success: true, data: products };
  }

  @Post(':storeId/orders')
  async createOnlineOrder(
    @Param('storeId') storeId: string,
    @Body() dto: CreateOnlineOrderDto,
  ) {
    const order = await this.onlineOrdersService.createOnlineOrder(storeId, dto);
    return {
      success: true,
      message: 'Online order placed successfully! Please visit the store for pickup.',
      data: order,
    };
  }
}
