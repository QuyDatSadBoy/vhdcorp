import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '@service/mail/mail.module';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { PrismaService } from '@prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    ConfigModule,
    MailModule,
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, PrismaService, GoogleStrategy],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
