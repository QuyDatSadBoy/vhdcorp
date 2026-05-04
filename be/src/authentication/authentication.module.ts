import { Module } from "@nestjs/common";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationController } from "./authentication.controller";
import { UserService } from "@model/user/user.service";
import { PrismaService } from "@prisma/prisma.service";
import { CsrfModule } from "@service/csrf/csrf.module";

@Module({
  imports: [CsrfModule],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, UserService, PrismaService]
})
export class AuthenticationModule {
}
