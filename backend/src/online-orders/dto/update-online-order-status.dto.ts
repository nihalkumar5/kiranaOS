import { IsEnum, IsNotEmpty } from 'class-validator';
import { OnlineOrderStatus } from '@prisma/client';

export class UpdateOnlineOrderStatusDto {
  @IsEnum(OnlineOrderStatus, { message: 'Invalid order status' })
  @IsNotEmpty()
  status: OnlineOrderStatus;
}
