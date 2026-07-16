import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { randomInt } from 'crypto';
import { MailService } from '@service/mail/mail.service';
import { PrismaService } from '@prisma/prisma.service';
import { Role, User } from '@vhd/prisma-client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

/** Phiên khách và phiên quản trị lưu refresh hash ở 2 cột riêng → không đè nhau. */
type SessionScope = 'client' | 'admin';

export type SafeUser = Omit<
  User,
  | 'password'
  | 'refreshTokenHash'
  | 'adminRefreshTokenHash'
  | 'deletedAt'
  | 'updatedAt'
  | 'verifyCodeHash'
  | 'verifyCodeExpiresAt'
  | 'resetCodeHash'
  | 'resetCodeExpiresAt'
>;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  phone: true,
  address: true,
  googleId: true,
  isRoot: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthenticationService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (clientId && clientSecret) {
      this.googleClient = new OAuth2Client(
        clientId,
        clientSecret,
        this.config.get<string>('GOOGLE_CALLBACK_URL'),
      );
    }
  }

  /**
   * Đăng ký: tạo tài khoản CHƯA xác minh + gửi mã OTP về email thật.
   * KHÔNG auto-login — user phải nhập mã (verifyEmail) mới đăng nhập được.
   */
  async register(dto: RegisterDto): Promise<{ user: SafeUser }> {
    const existed = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existed) throw new ConflictException('Email đã được đăng ký');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        role: Role.CUSTOMER,
      },
      select: SAFE_USER_SELECT,
    });
    await this.issueOtp(user.id, user.email, user.name, 'verify');
    return { user };
  }

  /** Sinh mã OTP 6 số, lưu bcrypt hash + hạn 10 phút, gửi email */
  private async issueOtp(
    userId: number,
    email: string,
    name: string,
    purpose: 'verify' | 'reset',
  ): Promise<void> {
    const code = String(randomInt(100000, 1000000)); // 6 chữ số, crypto-safe
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data:
        purpose === 'verify'
          ? { verifyCodeHash: hash, verifyCodeExpiresAt: expiresAt }
          : { resetCodeHash: hash, resetCodeExpiresAt: expiresAt },
    });
    // Gửi mail nền — lỗi SMTP không chặn response (user có thể bấm gửi lại)
    void this.mail
      .sendOtpEmail(email, name, code, purpose)
      .catch((e: Error) =>
        this.loggerWarnMail(purpose, email, e?.message ?? String(e)),
      );
  }

  private loggerWarnMail(purpose: string, email: string, msg: string): void {
    // eslint-disable-next-line no-console -- cảnh báo gửi OTP thất bại, không throw
    console.warn(
      `[Auth] Gửi mail OTP (${purpose}) tới ${email} thất bại: ${msg}`,
    );
  }

  /** Xác minh email bằng mã OTP → kích hoạt + đăng nhập luôn */
  async verifyEmail(
    email: string,
    code: string,
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt)
      throw new UnauthorizedException('Mã không đúng hoặc đã hết hạn');
    if (user.emailVerifiedAt) {
      // Đã xác minh rồi → coi như thành công, đăng nhập luôn
    } else {
      if (
        !user.verifyCodeHash ||
        !user.verifyCodeExpiresAt ||
        user.verifyCodeExpiresAt < new Date() ||
        !(await bcrypt.compare(code, user.verifyCodeHash))
      ) {
        throw new UnauthorizedException('Mã không đúng hoặc đã hết hạn');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          verifyCodeHash: null,
          verifyCodeExpiresAt: null,
        },
      });
    }
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user: this.toSafeUser(user), tokens };
  }

  /** Gửi lại mã xác minh (luôn trả thông báo chung — không lộ email tồn tại) */
  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.deletedAt && !user.emailVerifiedAt) {
      await this.issueOtp(user.id, user.email, user.name, 'verify');
    }
    return {
      message:
        'Nếu email tồn tại và chưa xác minh, mã mới đã được gửi tới hộp thư',
    };
  }

  /** Quên mật khẩu: gửi mã OTP về email (luôn trả thông báo chung) */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.deletedAt && user.password) {
      await this.issueOtp(user.id, user.email, user.name, 'reset');
    }
    return {
      message:
        'Nếu email đã đăng ký, mã đặt lại mật khẩu đã được gửi tới hộp thư',
    };
  }

  /** Đặt lại mật khẩu bằng mã OTP — thu hồi mọi phiên đăng nhập cũ */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      user.deletedAt ||
      !user.resetCodeHash ||
      !user.resetCodeExpiresAt ||
      user.resetCodeExpiresAt < new Date() ||
      !(await bcrypt.compare(code, user.resetCodeHash))
    ) {
      throw new UnauthorizedException('Mã không đúng hoặc đã hết hạn');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetCodeHash: null,
        resetCodeExpiresAt: null,
        refreshTokenHash: null, // đăng xuất mọi thiết bị cũ (cả 2 scope)
        adminRefreshTokenHash: null,
        // Đặt lại mật khẩu qua email = đã chứng minh sở hữu email
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });
    return {
      message: 'Đặt lại mật khẩu thành công — hãy đăng nhập bằng mật khẩu mới',
    };
  }

  async login(
    dto: LoginDto,
    opts: { isAdmin?: boolean } = {},
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'Tài khoản này dùng Google OAuth — vui lòng đăng nhập bằng Google',
      );
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    if (!user.emailVerifiedAt && !user.googleId) {
      throw new ForbiddenException(
        'Email chưa được xác minh — vui lòng nhập mã đã gửi tới hộp thư (hoặc bấm gửi lại mã)',
      );
    }

    if (opts.isAdmin && user.role !== Role.ADMIN && user.role !== Role.STAFF) {
      throw new ForbiddenException('Tài khoản không có quyền quản trị');
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.persistRefreshHash(
      user.id,
      tokens.refreshToken,
      opts.isAdmin ? 'admin' : 'client',
    );
    return { user: this.toSafeUser(user), tokens };
  }

  async refresh(
    refreshToken: string | undefined,
    scope: SessionScope = 'client',
  ): Promise<{ tokens: TokenPair; user: SafeUser }> {
    if (!refreshToken) throw new UnauthorizedException('Thiếu refresh token');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    // So khớp refresh hash theo ĐÚNG scope (admin/khách) — 2 phiên độc lập.
    const storedHash =
      scope === 'admin' ? user?.adminRefreshTokenHash : user?.refreshTokenHash;
    if (!user || user.deletedAt || !storedHash) {
      throw new UnauthorizedException('Phiên đăng nhập không tồn tại');
    }

    const matched = await bcrypt.compare(refreshToken, storedHash);
    if (!matched) {
      // Token reuse detection — chỉ thu hồi phiên của scope này, không đụng scope kia
      await this.prisma.user.update({
        where: { id: user.id },
        data:
          scope === 'admin'
            ? { adminRefreshTokenHash: null }
            : { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.persistRefreshHash(user.id, tokens.refreshToken, scope);
    return { tokens, user: this.toSafeUser(user) };
  }

  async logout(userId: number, scope: SessionScope = 'client'): Promise<void> {
    // Chỉ xóa phiên của scope đang đăng xuất — tab admin/khách còn lại giữ nguyên
    await this.prisma.user.update({
      where: { id: userId },
      data:
        scope === 'admin'
          ? { adminRefreshTokenHash: null }
          : { refreshTokenHash: null },
    });
  }

  async me(userId: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');
    return user;
  }

  /**
   * Google OAuth (idToken flow — client gửi credential từ Google Sign-In SDK).
   * Server-side OAuth (passport-google-oauth20) cho admin Phase 1.5.
   */
  async googleSignIn(
    idToken: string,
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    if (!this.googleClient) {
      throw new BadRequestException('Google OAuth chưa được cấu hình');
    }
    let profile: {
      email?: string;
      name?: string;
      picture?: string;
      sub?: string;
    };
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      });
      profile = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException('ID token Google không hợp lệ');
    }

    if (!profile.email || !profile.sub) {
      throw new UnauthorizedException('Profile Google thiếu email');
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? '',
          avatar: profile.picture ?? null,
          googleId: profile.sub,
          role: Role.CUSTOMER,
          emailVerifiedAt: new Date(), // email do Google xác thực sẵn
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.sub,
          avatar: user.avatar ?? profile.picture ?? null,
        },
      });
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user: this.toSafeUser(user), tokens };
  }

  // ── private helpers ────────────────────────────────────────────────────

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES') || '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async persistRefreshHash(
    userId: number,
    refreshToken: string,
    scope: SessionScope = 'client',
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data:
        scope === 'admin'
          ? { adminRefreshTokenHash: hash }
          : { refreshTokenHash: hash },
    });
  }

  /**
   * Xử lý profile từ Passport Google strategy (redirect OAuth flow).
   */
  async googleSignInFromProfile(profile: {
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }): Promise<{ user: SafeUser; tokens: TokenPair }> {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatar: profile.picture ?? null,
          googleId: profile.googleId,
          role: Role.CUSTOMER,
          emailVerifiedAt: new Date(), // email do Google xác thực sẵn
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          avatar: user.avatar ?? profile.picture ?? null,
        },
      });
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user: this.toSafeUser(user), tokens };
  }

  private toSafeUser(user: User): SafeUser {
    // Loại các field nhạy cảm trước khi trả về client
    const {
      password: _p,
      refreshTokenHash: _r,
      adminRefreshTokenHash: _ar,
      deletedAt: _d,
      updatedAt: _u,
      verifyCodeHash: _v,
      verifyCodeExpiresAt: _ve,
      resetCodeHash: _rc,
      resetCodeExpiresAt: _re,
      ...safe
    } = user;
    void _p;
    void _r;
    void _d;
    void _u;
    void _v;
    void _ve;
    void _rc;
    void _re;
    return safe;
  }
}
