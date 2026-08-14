import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Store name must be at least 3 characters long' })
  storeName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Admin name must be at least 2 characters long' })
  adminName: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  adminPassword: string;
}
