import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OnlinePaymentMode } from '@prisma/client';

class OnlineOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.001, { message: 'Quantity must be greater than 0' })
  quantity: number;
}

export class CreateOnlineOrderDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  customerMobile: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsEnum(OnlinePaymentMode, { message: 'Invalid payment mode' })
  @IsNotEmpty()
  paymentMode: OnlinePaymentMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnlineOrderItemDto)
  items: OnlineOrderItemDto[];
}
