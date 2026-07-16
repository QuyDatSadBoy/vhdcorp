import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthenticationService } from './authentication.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/otp.dto';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { GoogleAuthGuard } from '@guard/google-auth.guard';
import { Public } from '@decorator/public.decorator';
import { CurrentUser, JwtPayload } from '@decorator/current-user.decorator';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  cookieNamesFor,
  requestScope,
  setAuthCookies,
} from '@util/cookies';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto) {
    const { user } = await this.authService.register(dto);
    return {
      user,
      requiresVerification: true,
      message:
        'Đã gửi mã xác minh tới email của bạn — nhập mã để kích hoạt tài khoản',
    };
  }

  /** Xác minh email bằng mã OTP → kích hoạt + đăng nhập luôn */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.verifyEmail(
      dto.email,
      dto.code,
    );
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user };
  }

  /** Gửi lại mã xác minh email */
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerification(dto.email);
  }

  /** Quên mật khẩu — gửi mã OTP về email */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** Đặt lại mật khẩu bằng mã OTP */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Rate limit chặt chống brute-force: 5 lần/phút mỗi IP
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user };
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto, {
      isAdmin: true,
    });
    // Phiên admin dùng bộ cookie riêng — không đè phiên khách ở tab khác
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, 'admin');
    return { user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const scope = requestScope(req);
    const refreshToken = req.signedCookies?.[cookieNamesFor(scope).refresh];
    if (!refreshToken) throw new UnauthorizedException('Thiếu refresh token');
    const { user, tokens } = await this.authService.refresh(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, scope);
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    // Chỉ xóa cookie của scope đang đăng xuất — tab admin/khách còn lại không bị văng
    clearAuthCookies(res, requestScope(req));
    return { message: 'Đăng xuất thành công' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  /**
   * Google Sign-In (idToken flow).
   * Client gửi credential từ Google Identity Services SDK → BE verify.
   */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(
    @Body() body: { idToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.googleSignIn(body?.idToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user };
  }

  /**
   * Google OAuth redirect flow (Passport).
   * Browser redirect → Google consent screen.
   */
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleRedirect(): void {
    // Guard thực hiện redirect, không cần body
  }

  /**
   * Google OAuth callback — Google redirect về sau khi user xác nhận.
   */
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile; query: { state?: string } },
    @Res() res: Response,
  ): Promise<void> {
    const { tokens } = await this.authService.googleSignInFromProfile(req.user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    const next = req.query.state ?? '/account/profile';
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    res.redirect(`${frontendUrl}/callback?next=${encodeURIComponent(next)}`);
  }

  // Đảm bảo cookie ACCESS_COOKIE còn được tham chiếu (anti tree-shake) — không có ý nghĩa runtime
  static readonly _ref = ACCESS_COOKIE;
}
