import { Module } from '@nestjs/common';
import { MailModule } from '@service/mail/mail.module';
import { ServerAdminController } from './server-admin.controller';
import { ServerAdminService } from './server-admin.service';

/** Quản trị VPS (theo dõi + dọn rác + backup + deploy) — chỉ ADMIN */
@Module({
  imports: [MailModule],
  controllers: [ServerAdminController],
  providers: [ServerAdminService],
})
export class ServerAdminModule {}
