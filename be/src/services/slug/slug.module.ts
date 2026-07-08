import { Module, Global } from '@nestjs/common';
import { SlugService } from './slug.service';
import { PrismaService } from '@prisma/prisma.service';

@Global()
@Module({
  providers: [SlugService, PrismaService],
  exports: [SlugService],
})
export class SlugModule {}
