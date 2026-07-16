import { effectivePrice } from './pricing';
import { Prisma } from '@vhd/prisma-client';

/** Giá hiệu lực: giá KM khi còn hạn, ngược lại giá gốc — không được lấy giá KM đã hết hạn. */
describe('effectivePrice (giá khuyến mãi)', () => {
  const D = (n: number) => new Prisma.Decimal(n);
  it('không có KM → giá gốc', () => {
    expect(
      effectivePrice({ price: D(25000), salePrice: null, saleEndsAt: null }),
    ).toBe(25000);
  });
  it('KM không hạn → giá KM', () => {
    expect(
      effectivePrice({
        price: D(25000),
        salePrice: D(19000),
        saleEndsAt: null,
      }),
    ).toBe(19000);
  });
  it('KM còn hạn → giá KM', () => {
    expect(
      effectivePrice({
        price: D(25000),
        salePrice: D(19000),
        saleEndsAt: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(19000);
  });
  it('KM HẾT HẠN → quay về giá gốc', () => {
    expect(
      effectivePrice({
        price: D(25000),
        salePrice: D(19000),
        saleEndsAt: new Date(Date.now() - 86_400_000),
      }),
    ).toBe(25000);
  });
  it('salePrice = 0 → giá gốc', () => {
    expect(
      effectivePrice({ price: D(25000), salePrice: D(0), saleEndsAt: null }),
    ).toBe(25000);
  });
});
