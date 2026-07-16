import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  // Số điện thoại — BẮT BUỘC (khách để lại SĐT mới liên hệ lại được)
  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  @IsString()
  @MinLength(8, { message: 'Số điện thoại tối thiểu 8 ký tự' })
  @MaxLength(20)
  phone: string;

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
