import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  // Số điện thoại — không bắt buộc
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // Tiêu đề — không bắt buộc
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}
