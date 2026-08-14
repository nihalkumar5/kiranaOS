import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(
    @GetUser('storeId') storeId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    const customer = await this.customersService.create(storeId, dto);
    return {
      success: true,
      message: 'Customer added successfully',
      data: customer,
    };
  }

  @Get()
  async findAll(
    @GetUser('storeId') storeId: string,
    @Query('search') search?: string,
  ) {
    const customers = await this.customersService.findAll(storeId, search);
    return {
      success: true,
      data: customers,
    };
  }

  @Get('mobile/:mobile')
  async findByMobile(
    @GetUser('storeId') storeId: string,
    @Param('mobile') mobile: string,
  ) {
    const customer = await this.customersService.findByMobile(storeId, mobile);
    return {
      success: true,
      data: customer,
    };
  }

  @Get(':id')
  async findOne(
    @GetUser('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    const customer = await this.customersService.findOne(storeId, id);
    return {
      success: true,
      data: customer,
    };
  }
}
