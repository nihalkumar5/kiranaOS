import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(
    @GetUser('storeId') storeId: string,
    @Body() dto: CreateProductDto,
  ) {
    const product = await this.productsService.create(storeId, dto);
    return {
      success: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  @Get()
  async findAll(
    @GetUser('storeId') storeId: string,
    @Query('search') search?: string,
  ) {
    const products = await this.productsService.findAll(storeId, search);
    return {
      success: true,
      data: products,
    };
  }

  @Get('barcode/:barcode')
  async findOneByBarcode(
    @GetUser('storeId') storeId: string,
    @Param('barcode') barcode: string,
  ) {
    const product = await this.productsService.findOneByBarcode(storeId, barcode);
    return {
      success: true,
      data: product,
    };
  }

  @Get(':id')
  async findOne(
    @GetUser('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    const product = await this.productsService.findOne(storeId, id);
    return {
      success: true,
      data: product,
    };
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @GetUser('storeId') storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(storeId, id, dto);
    return {
      success: true,
      message: 'Product updated successfully',
      data: product,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @GetUser('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    await this.productsService.remove(storeId, id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
