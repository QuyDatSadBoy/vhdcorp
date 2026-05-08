import { AuthGuard } from "@nestjs/passport";
import { ExecutionContext } from "@nestjs/common";

export class GoogleAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ query?: { next?: string } }>();
    const next = req.query?.next ?? "/account/profile";
    return { session: false, state: next };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return (await super.canActivate(context)) as boolean;
  }
}