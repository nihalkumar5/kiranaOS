import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AuditAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0, { message: 'Actual stock quantity cannot be negative' })
  actualStock: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
