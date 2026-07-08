import { Module } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { SiteConfigController } from './site-config.controller';
import { PrismaService } from '@prisma/prisma.service';

@Module({
  controllers: [SiteConfigController],
  providers: [SiteConfigService, PrismaService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
