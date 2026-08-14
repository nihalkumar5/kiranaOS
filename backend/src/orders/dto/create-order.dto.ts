import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode } from '@prisma/client';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.001, { message: 'Quantity must be greater than 0' })
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Discount cannot be negative' })
  discount?: number;

  @IsEnum(PaymentMode, { message: 'Invalid payment mode' })
  @IsNotEmpty()
  paymentMode: PaymentMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
