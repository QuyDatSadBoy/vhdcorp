import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'Mã xác minh gồm 6 chữ số' })
  code!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'Mã xác minh gồm 6 chữ số' })
  code!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới tối thiểu 6 ký tự' })
  @MaxLength(72)
  newPassword!: string;
}
