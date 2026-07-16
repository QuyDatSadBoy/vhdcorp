import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { MailService } from '@service/mail/mail.service';
import { OrderStatus, Prisma } from '@vhd/prisma-client';
import { VoucherService } from '../voucher/voucher.service';
import { CreateOrderDto } from './dto/order.dto';

/** Giá hiệu lực của sản phẩm: salePrice khi còn hạn khuyến mãi, ngược lại price. */
export function effectivePrice(p: {
  price: Prisma.Decimal;
  salePrice: Prisma.Decimal | null;
  saleEndsAt: Date | null;
}): number {
  const sale = p.salePrice ? Number(p.salePrice) : null;
  if (sale != null && sale > 0 && (!p.saleEndsAt || p.saleEndsAt > new Date()))
    return sale;
  return Number(p.price);
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private vouchers: VoucherService,
  ) {}

  /**
   * Đặt hàng (không thanh toán online): giá + giảm giá tính lại HOÀN TOÀN server-side
   * từ DB (không tin số liệu client); voucher trừ lượt trong cùng transaction.
   */
  async create(dto: CreateOrderDto, userId?: number) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED', deletedAt: null },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const items = dto.items.map((i) => {
      const p = byId.get(i.productId);
      if (!p)
        throw new BadRequestException(
          'Có sản phẩm trong giỏ không còn bán — vui lòng tải lại giỏ hàng',
        );
      if (p.stock > 0 && i.qty > p.stock)
        throw new BadRequestException(
          `"${p.name}" chỉ còn ${p.stock} sản phẩm trong kho`,
        );
      const price = effectivePrice(p);
      subtotal += price * i.qty;
      return { productId: p.id, name: p.name, price, qty: i.qty };
    });

    let discount = 0;
    let voucherId: number | undefined;
    let voucherCode: string | undefined;
    let voucherMaxUses = 0;
    if (dto.voucherCode?.trim()) {
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: dto.voucherCode.trim().toUpperCase() },
      });
      if (!voucher) throw new NotFoundException('Mã voucher không tồn tại');
      discount = this.vouchers.computeDiscount(voucher, subtotal);
      voucherId = voucher.id;
      voucherCode = voucher.code;
      voucherMaxUses = voucher.maxUses;
    }

    const code = `VHD-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
    const order = await this.prisma.$transaction(async (tx) => {
      if (voucherId) {
        // Trừ lượt atomically — chặn vượt maxUses khi 2 đơn đặt cùng lúc
        const updated = await tx.voucher.updateMany({
          where: {
            id: voucherId,
            ...(voucherMaxUses > 0
              ? { usedCount: { lt: voucherMaxUses } }
              : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count === 0)
          throw new BadRequestException('Voucher đã hết lượt sử dụng');
      }
      return tx.order.create({
        data: {
          code,
          name: dto.name.trim(),
          email: dto.email.trim(),
          phone: dto.phone.trim(),
          address: dto.address.trim(),
          note: dto.note?.trim() || null,
          subtotal,
          discount,
          total: subtotal - discount,
          voucherId,
          voucherCode,
          userId: userId ?? null,
          items: { create: items },
        },
        include: { items: true },
      });
    });

    this.logger.log(
      `Đơn hàng mới ${order.code} — ${dto.name} <${dto.email}> — ${order.total}đ`,
    );
    // Fire-and-forget: mail lỗi chỉ log, không chặn response
    void this.mail.sendOrderNotification(order);
    void this.mail.sendOrderConfirmation(order);
    return order;
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where = params.status ? { status: params.status } : {};
    const [records, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      records,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async findById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    await this.findById(id);
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
  }

  /** Đơn của chính khách đang đăng nhập (theo dõi đơn hàng). */
  myOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
