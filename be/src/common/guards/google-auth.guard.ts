import { AuthGuard } from "@nestjs/passport";
import { ExecutionContext } from "@nestjs/common";

export class GoogleAuthGuard extends AuthGuard("google") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activate = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    await super.logIn(request);
    console.log(activate);
    return activate;
  }
}