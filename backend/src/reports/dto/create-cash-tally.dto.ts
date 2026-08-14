import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCashTallyDto {
  @IsNumber()
  @Min(0, { message: 'Actual amount cannot be negative' })
  actualAmount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
