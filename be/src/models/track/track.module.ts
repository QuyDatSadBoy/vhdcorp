import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';

@Module({
  controllers: [TrackController],
  providers: [TrackService, PrismaService],
  exports: [TrackService],
})
export class TrackModule {}
