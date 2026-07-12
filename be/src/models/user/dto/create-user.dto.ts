import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@vhd/prisma-client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  @IsOptional()
  password?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsEnum(Role, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: Role;
}

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  newPassword!: string;
}
