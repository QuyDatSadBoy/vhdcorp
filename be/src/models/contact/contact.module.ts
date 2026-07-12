import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { PrismaService } from '@prisma/prisma.service';
import { MailModule } from '@service/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [ContactController],
  providers: [ContactService, PrismaService],
})
export class ContactModule {}
