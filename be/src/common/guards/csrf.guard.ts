import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";
import { CsrfService } from "@service/csrf/csrf.service";


@Injectable()
export class CsrfGuard implements CanActivate{
  constructor(private readonly csrfService: CsrfService) {}
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = request.signedCookies?.["csrf_secret"]
    const token = request.headers?.['x-csrf-token'];
    if (!secret || !token || !this.csrfService.validateToken(secret.toString(), token.toString())) {
      throw new UnauthorizedException('Invalid CSRF token');
    }
    return true;
  }
}