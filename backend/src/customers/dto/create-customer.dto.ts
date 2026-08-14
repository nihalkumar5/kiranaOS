import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number (should be 10 digits starting with 6-9)' })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
