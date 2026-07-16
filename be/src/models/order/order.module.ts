import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '@prisma/prisma.service';
import { MailModule } from '@service/mail/mail.module';
import { VoucherModule } from '../voucher/voucher.module';

@Module({
  imports: [MailModule, VoucherModule, JwtModule.register({})],
  controllers: [OrderController],
  providers: [OrderService, PrismaService],
  exports: [OrderService],
})
export class OrderModule {}
