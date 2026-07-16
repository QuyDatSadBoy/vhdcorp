import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@vhd/prisma-client';

export class OrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'Sản phẩm không hợp lệ' })
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  qty!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100)
  name!: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @MinLength(8, { message: 'Số điện thoại tối thiểu 8 ký tự' })
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  @MaxLength(300)
  address!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;

  @IsString()
  @IsOptional()
  voucherCode?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng đang trống' })
  @ArrayMaxSize(50, { message: 'Tối đa 50 mặt hàng mỗi đơn' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn không hợp lệ' })
  status!: OrderStatus;
}
