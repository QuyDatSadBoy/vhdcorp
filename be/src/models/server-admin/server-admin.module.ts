import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '@service/mail/mail.module';
import { ServerAdminController } from './server-admin.controller';
import { ServerAdminService } from './server-admin.service';
import { TerminalGateway } from './terminal.gateway';

/** Quản trị VPS (theo dõi + dọn rác + backup + deploy + terminal) — chỉ ADMIN */
@Module({
  imports: [MailModule, JwtModule.register({})],
  controllers: [ServerAdminController],
  providers: [ServerAdminService, TerminalGateway],
})
export class ServerAdminModule {}
