import { Prisma } from '@vhd/prisma-client';

/** Giá hiệu lực của sản phẩm: salePrice khi còn hạn khuyến mãi, ngược lại price.
 *  Hàm thuần — tách riêng để test đơn vị không phụ thuộc DI/DB. */
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
