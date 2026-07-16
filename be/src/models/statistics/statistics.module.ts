import { Module } from '@nestjs/common';
import { TrackModule } from '@model/track/track.module';
import { PrismaService } from '@prisma/prisma.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [TrackModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, PrismaService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
