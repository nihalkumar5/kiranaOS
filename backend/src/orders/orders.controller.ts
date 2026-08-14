import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @GetUser('storeId') storeId: string,
    @GetUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.ordersService.create(storeId, userId, dto);
    return {
      success: true,
      message: 'Order created successfully',
      data: order,
    };
  }

  @Get()
  async findAll(@GetUser('storeId') storeId: string) {
    const orders = await this.ordersService.findAll(storeId);
    return {
      success: true,
      data: orders,
    };
  }

  @Get(':id')
  async findOne(
    @GetUser('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    const order = await this.ordersService.findOne(storeId, id);
    return {
      success: true,
      data: order,
    };
  }

  @Put(':id/cancel')
  @Roles(Role.ADMIN)
  async cancel(
    @GetUser('storeId') storeId: string,
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const order = await this.ordersService.cancel(storeId, userId, id);
    return {
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    };
  }
}
