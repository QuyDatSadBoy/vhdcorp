import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatar?: string;

  /** SĐT giao hàng — gợi ý tự điền khi đặt đơn */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /** Địa chỉ giao hàng mặc định */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MaxLength(128)
  newPassword!: string;
}
