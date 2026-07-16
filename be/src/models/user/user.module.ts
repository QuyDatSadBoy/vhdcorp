import { Module } from '@nestjs/common';
import { MailModule } from '@service/mail/mail.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '@prisma/prisma.service';

@Module({
  imports: [MailModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
