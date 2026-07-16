import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { Role } from '@vhd/prisma-client';
import { StatisticsService } from './statistics.service';
import { TrackService } from '@model/track/track.service';

@Controller('statistics')
@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class StatisticsController {
  constructor(
    private readonly service: StatisticsService,
    private readonly track: TrackService,
  ) {}

  /** Lượt xem sản phẩm theo ngày (tracking thật từ view_events) */
  @Get('views')
  views(@Query('days') days?: string) {
    const n = Number(days);
    return this.track.viewsByDay(
      Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 30,
    );
  }

  /** Top sản phẩm được xem nhiều nhất */
  @Get('top-viewed')
  topViewed(@Query('days') days?: string) {
    const n = Number(days);
    return this.track.topViewedProducts(
      Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 30,
      10,
    );
  }

  /** Xuất báo cáo CSV: type = views | top-viewed | contacts | products.
   *  Dùng @Res trực tiếp để trả CSV thuần (bypass TransformInterceptor bọc JSON). */
  @Get('export')
  async exportCsv(
    @Query('type') type: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(type ?? 'views', this.track);
    res
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        'attachment; filename="bao-cao-vhd.csv"',
      )
      .send(csv);
  }

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
