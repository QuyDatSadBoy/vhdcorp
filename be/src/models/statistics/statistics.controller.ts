import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { Role } from '@vhd/prisma-client';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Get('timeseries')
  timeseries(@Query('days') days?: string) {
    const n = Number(days);
    return this.service.timeseries(
      Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 7,
    );
  }

  @Get('categories-breakdown')
  categoriesBreakdown() {
    return this.service.categoriesBreakdown();
  }

  @Get('top-products')
  topProducts(@Query('limit') limit?: string) {
    const n = Number(limit);
    return this.service.topProducts(Number.isFinite(n) && n > 0 ? n : 6);
  }
}
