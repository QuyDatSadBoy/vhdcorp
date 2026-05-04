import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly configService : ConfigService) {
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request?.signedCookies?.['auth_token'];
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      request.user = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.configService.getOrThrow("JWT_SECRET")
        }
      );

      return true;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedException("Token has expired");
      } else {
        throw new UnauthorizedException("Invalid token");
      }
    }
  }
}