import * as bcrypt from 'bcrypt';
import { AuthenticationService } from './authentication.service';

/**
 * Auth: phiên ADMIN và phiên KHÁCH phải dùng refresh hash RIÊNG (2 cột) —
 * mở 2 tab (1 admin, 1 khách) cùng tài khoản KHÔNG được thu hồi (reuse-detect)
 * lẫn nhau. Đây là bug "reload admin bị out" khi đăng nhập cả admin lẫn client.
 */
describe('AuthenticationService.refresh — tách phiên admin/khách', () => {
  const RT = 'refresh-token-value';

  const makeSvc = (user: Record<string, unknown>) => {
    const updateCalls: { data: Record<string, unknown> }[] = [];
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest
          .fn()
          .mockImplementation((a: { data: Record<string, unknown> }) => {
            updateCalls.push(a);
            return Promise.resolve(user);
          }),
      },
    };
    const jwt = {
      verifyAsync: jest
        .fn()
        .mockResolvedValue({ sub: 1, email: 'a@b.c', role: 'ADMIN' }),
      signAsync: jest.fn().mockResolvedValue('new-token'),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
      get: jest.fn().mockReturnValue('15m'),
    };
    const svc = new AuthenticationService(
      prisma as never,
      jwt as never,
      config as never,
      {} as never,
    );
    return { svc, updateCalls };
  };

  const baseUser = (over: Record<string, unknown>) => ({
    id: 1,
    email: 'a@b.c',
    name: 'A',
    role: 'ADMIN',
    deletedAt: null,
    refreshTokenHash: null,
    adminRefreshTokenHash: null,
    createdAt: new Date(),
    ...over,
  });

  it('scope=admin so khớp + ghi vào adminRefreshTokenHash (không đụng cột khách)', async () => {
    const user = baseUser({
      refreshTokenHash: 'client-hash',
      adminRefreshTokenHash: await bcrypt.hash(RT, 10),
    });
    const { svc, updateCalls } = makeSvc(user);
    const res = await svc.refresh(RT, 'admin');
    expect(res.tokens.accessToken).toBe('new-token');
    expect(updateCalls.at(-1)!.data).toHaveProperty('adminRefreshTokenHash');
    expect(updateCalls.at(-1)!.data).not.toHaveProperty('refreshTokenHash');
  });

  it('scope=client so khớp + ghi vào refreshTokenHash (không đụng cột admin)', async () => {
    const user = baseUser({
      role: 'CUSTOMER',
      refreshTokenHash: await bcrypt.hash(RT, 10),
      adminRefreshTokenHash: 'admin-hash',
    });
    const { svc, updateCalls } = makeSvc(user);
    await svc.refresh(RT, 'client');
    expect(updateCalls.at(-1)!.data).toHaveProperty('refreshTokenHash');
    expect(updateCalls.at(-1)!.data).not.toHaveProperty(
      'adminRefreshTokenHash',
    );
  });

  it('reuse-detect scope=admin CHỈ xóa adminRefreshTokenHash (giữ phiên khách)', async () => {
    const user = baseUser({
      refreshTokenHash: await bcrypt.hash('client-rt', 10),
      adminRefreshTokenHash: await bcrypt.hash('a-different-token', 10),
    });
    const { svc, updateCalls } = makeSvc(user);
    await expect(svc.refresh(RT, 'admin')).rejects.toThrow('thu hồi');
    expect(updateCalls.at(-1)!.data).toEqual({ adminRefreshTokenHash: null });
  });

  it('phiên admin trống (chỉ có hash khách) → admin refresh fail nhưng KHÔNG thu hồi phiên khách', async () => {
    const user = baseUser({
      refreshTokenHash: await bcrypt.hash(RT, 10),
      adminRefreshTokenHash: null,
    });
    const { svc, updateCalls } = makeSvc(user);
    await expect(svc.refresh(RT, 'admin')).rejects.toThrow('không tồn tại');
    // storedHash null → ném trước reuse-detect → không update gì (phiên khách nguyên vẹn)
    expect(updateCalls.length).toBe(0);
  });
});
