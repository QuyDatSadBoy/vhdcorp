import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@decorator/public.decorator';
import { cookieNamesFor, requestScope } from '@util/cookies';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Token qua HttpOnly Cookie (signed) — phiên admin/khách dùng bộ cookie riêng
    const token =
      request?.signedCookies?.[cookieNamesFor(requestScope(request)).access];
    if (!token) {
      throw new UnauthorizedException('Không tìm thấy access token');
    }

    try {
      request.user = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
      });
      return true;
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token hết hạn');
      }
      throw new UnauthorizedException('Access token không hợp lệ');
    }
  }
}
