import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { VoucherType } from '@vhd/prisma-client';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Mã voucher chỉ gồm chữ, số, gạch ngang/dưới',
  })
  code!: string;

  @IsEnum(VoucherType, { message: 'Loại voucher phải là PERCENT hoặc FIXED' })
  type!: VoucherType;

  @Type(() => Number)
  @IsNumber({}, { message: 'Giá trị giảm phải là số' })
  @Min(1, { message: 'Giá trị giảm tối thiểu là 1' })
  value!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrder?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxUses?: number;

  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  @IsOptional()
  startsAt?: string;

  @IsDateString({}, { message: 'Ngày hết hạn không hợp lệ' })
  endsAt!: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateVoucherDto extends CreateVoucherDto {}

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mã voucher' })
  code!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Tổng tiền không hợp lệ' })
  @Min(0)
  subtotal!: number;
}
