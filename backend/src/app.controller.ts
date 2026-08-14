import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('store/:storeId/products')
  async getStoreProducts(@Param('storeId') storeId: string) {
    const products = await this.appService.getStoreProducts(storeId);
    return { success: true, data: products };
  }
}
