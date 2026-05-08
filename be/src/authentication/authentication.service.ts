import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "@prisma/prisma.service";
import { Role, User } from "@vhd/prisma-client";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

export type SafeUser = Omit<User, "password" | "refreshTokenHash" | "deletedAt" | "updatedAt">;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  googleId: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthenticationService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    if (clientId && clientSecret) {
      this.googleClient = new OAuth2Client(
        clientId,
        clientSecret,
        this.config.get<string>("GOOGLE_CALLBACK_URL"),
      );
    }
  }

  async register(dto: RegisterDto): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const existed = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existed) throw new ConflictException("Email đã được đăng ký");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: passwordHash, name: dto.name, role: Role.CUSTOMER },
      select: SAFE_USER_SELECT,
    });
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user, tokens };
  }

  async login(
    dto: LoginDto,
    opts: { isAdmin?: boolean } = {},
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    }
    if (!user.password) {
      throw new UnauthorizedException(
        "Tài khoản này dùng Google OAuth — vui lòng đăng nhập bằng Google",
      );
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException("Email hoặc mật khẩu không đúng");

    if (opts.isAdmin && user.role !== Role.ADMIN && user.role !== Role.STAFF) {
      throw new ForbiddenException("Tài khoản không có quyền quản trị");
    }

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user: this.toSafeUser(user), tokens };
  }

  async refresh(
    refreshToken: string | undefined,
  ): Promise<{ tokens: TokenPair; user: SafeUser }> {
    if (!refreshToken) throw new UnauthorizedException("Thiếu refresh token");

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt || !user.refreshTokenHash) {
      throw new UnauthorizedException("Phiên đăng nhập không tồn tại");
    }

    const matched = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matched) {
      // Token reuse detection — revoke session
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException("Refresh token đã bị thu hồi");
    }

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { tokens, user: this.toSafeUser(user) };
  }

  async logout(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async me(userId: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new UnauthorizedException("Người dùng không tồn tại");
    return user;
  }

  /**
   * Google OAuth (idToken flow — client gửi credential từ Google Sign-In SDK).
   * Server-side OAuth (passport-google-oauth20) cho admin Phase 1.5.
   */
  async googleSignIn(idToken: string): Promise<{ user: SafeUser; tokens: TokenPair }> {
    if (!this.googleClient) {
      throw new BadRequestException("Google OAuth chưa được cấu hình");
    }
    let profile: { email?: string; name?: string; picture?: string; sub?: string };
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.getOrThrow("GOOGLE_CLIENT_ID"),
      });
      profile = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException("ID token Google không hợp lệ");
    }

    if (!profile.email || !profile.sub) {
      throw new UnauthorizedException("Profile Google thiếu email");
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? "",
          avatar: profile.picture ?? null,
          googleId: profile.sub,
          role: Role.CUSTOMER,
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub, avatar: user.avatar ?? profile.picture ?? null },
      });
    }

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user: this.toSafeUser(user), tokens };
  }

  // ── private helpers ────────────────────────────────────────────────────

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get("JWT_ACCESS_EXPIRES") || "15m",
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES") || "7d",
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async persistRefreshHash(userId: number, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
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
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, avatar: user.avatar ?? profile.picture ?? null },
      });
    }

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    await this.persistRefreshHash(user.id, tokens.refreshToken);
    return { user: this.toSafeUser(user), tokens };
  }

  private toSafeUser(user: User): SafeUser {
    // Loại các field nhạy cảm trước khi trả về client
    const { password: _p, refreshTokenHash: _r, deletedAt: _d, updatedAt: _u, ...safe } = user;
    void _p;
    void _r;
    void _d;
    void _u;
    return safe;
  }
}
