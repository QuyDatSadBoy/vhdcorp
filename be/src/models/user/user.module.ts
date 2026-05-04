import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PrismaService } from "@prisma/prisma.service";
import { CsrfModule } from "@service/csrf/csrf.module";

@Module({
  imports: [CsrfModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
})
export class UserModule {
}
