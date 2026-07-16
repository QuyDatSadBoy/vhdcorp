import { BadRequestException } from '@nestjs/common';
import { VoucherService } from './voucher.service';

/** Voucher: kiểm mọi case tính giảm giá — logic tiền bạc phải chuẩn 100%. */
describe('VoucherService.computeDiscount', () => {
  const svc = new VoucherService(null as never);
  const base = {
    id: 1,
    code: 'X',
    type: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: 10,
    minOrder: 0,
    maxUses: 0,
    usedCount: 0,
    active: true,
    startsAt: new Date(Date.now() - 86_400_000), // hôm qua
    endsAt: new Date(Date.now() + 86_400_000), // ngày mai
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const V = (o: Partial<typeof base>) => ({ ...base, ...o }) as never;

  it('giảm % đúng', () => {
    expect(svc.computeDiscount(V({ type: 'PERCENT', value: 10 }), 100000)).toBe(
      10000,
    );
  });
  it('giảm số tiền cố định đúng', () => {
    expect(
      svc.computeDiscount(V({ type: 'FIXED', value: 15000 }), 100000),
    ).toBe(15000);
  });
  it('% không vượt 100 và không vượt subtotal', () => {
    expect(
      svc.computeDiscount(V({ type: 'FIXED', value: 999999 }), 50000),
    ).toBe(50000);
    expect(svc.computeDiscount(V({ type: 'PERCENT', value: 200 }), 50000)).toBe(
      50000,
    );
  });
  it('voucher bị tắt → chặn', () => {
    expect(() => svc.computeDiscount(V({ active: false }), 100000)).toThrow(
      BadRequestException,
    );
  });
  it('chưa đến ngày → chặn', () => {
    expect(() =>
      svc.computeDiscount(
        V({ startsAt: new Date(Date.now() + 86_400_000) }),
        100000,
      ),
    ).toThrow(/chưa đến ngày/);
  });
  it('hết hạn → chặn', () => {
    expect(() =>
      svc.computeDiscount(
        V({ endsAt: new Date(Date.now() - 86_400_000) }),
        100000,
      ),
    ).toThrow(/hết hạn/);
  });
  it('hết lượt → chặn', () => {
    expect(() =>
      svc.computeDiscount(V({ maxUses: 5, usedCount: 5 }), 100000),
    ).toThrow(/hết lượt/);
  });
  it('dưới đơn tối thiểu → chặn', () => {
    expect(() => svc.computeDiscount(V({ minOrder: 200000 }), 100000)).toThrow(
      /tối thiểu/,
    );
  });
  it('đạt đơn tối thiểu → OK', () => {
    expect(
      svc.computeDiscount(
        V({ minOrder: 100000, type: 'FIXED', value: 20000 }),
        100000,
      ),
    ).toBe(20000);
  });
});
