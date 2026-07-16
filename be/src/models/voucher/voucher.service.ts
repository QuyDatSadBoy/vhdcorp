import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Voucher } from '@vhd/prisma-client';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

@Injectable()
export class VoucherService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: number) {
    const v = await this.prisma.voucher.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Không tìm thấy voucher');
    return v;
  }

  private toData(dto: CreateVoucherDto) {
    return {
      code: dto.code.toUpperCase(),
      type: dto.type,
      value: dto.value,
      minOrder: dto.minOrder ?? 0,
      maxUses: dto.maxUses ?? 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: new Date(dto.endsAt),
      active: dto.active ?? true,
    };
  }

  async create(dto: CreateVoucherDto) {
    const existed = await this.prisma.voucher.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existed) throw new BadRequestException('Mã voucher đã tồn tại');
    return this.prisma.voucher.create({ data: this.toData(dto) });
  }

  async update(id: number, dto: UpdateVoucherDto) {
    await this.findById(id);
    return this.prisma.voucher.update({
      where: { id },
      data: this.toData(dto),
    });
  }

  async remove(id: number) {
    await this.findById(id);
    return this.prisma.voucher.delete({ where: { id } });
  }

  /** Tính tiền giảm cho subtotal — throw lỗi tiếng Việt khi voucher không dùng được. */
  computeDiscount(voucher: Voucher, subtotal: number): number {
    const now = new Date();
    if (!voucher.active) throw new BadRequestException('Voucher đã bị tắt');
    if (now < voucher.startsAt)
      throw new BadRequestException('Voucher chưa đến ngày áp dụng');
    if (now > voucher.endsAt)
      throw new BadRequestException('Voucher đã hết hạn');
    if (voucher.maxUses > 0 && voucher.usedCount >= voucher.maxUses)
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    const minOrder = Number(voucher.minOrder);
    if (subtotal < minOrder)
      throw new BadRequestException(
        `Đơn tối thiểu ${minOrder.toLocaleString('vi-VN')}đ mới dùng được voucher này`,
      );
    const value = Number(voucher.value);
    const discount =
      voucher.type === 'PERCENT'
        ? Math.round((subtotal * Math.min(value, 100)) / 100)
        : value;
    return Math.min(discount, subtotal);
  }

  /** Khách nhập mã ở giỏ hàng → trả về mức giảm (không tăng usedCount). */
  async validate(code: string, subtotal: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!voucher) throw new NotFoundException('Mã voucher không tồn tại');
    const discount = this.computeDiscount(voucher, subtotal);
    return {
      code: voucher.code,
      type: voucher.type,
      value: Number(voucher.value),
      discount,
    };
  }
}
