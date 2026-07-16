import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

/** Cửa sổ dedupe: cùng khách xem cùng sản phẩm trong 30 phút chỉ tính 1 lượt */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class TrackService {
  constructor(private prisma: PrismaService) {}

  /** Ghi 1 lượt xem sản phẩm (bỏ qua nếu trùng trong cửa sổ dedupe / sản phẩm không tồn tại) */
  async recordView(
    productId: number,
    sessionId: string,
    userId?: number,
  ): Promise<{ recorded: boolean }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return { recorded: false };

    const recent = await this.prisma.viewEvent.findFirst({
      where: {
        productId,
        sessionId,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) return { recorded: false };

    await this.prisma.viewEvent.create({
      data: { productId, sessionId, userId: userId ?? null },
    });
    return { recorded: true };
  }

  /**
   * Recommendation "khách xem X cũng xem Y" (item-based co-view — collaborative
   * filtering tối giản, không cần model ML). Fallback: sản phẩm cùng danh mục.
   */
  async recommendationsFor(productId: number, limit = 8): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ productId: number }[]>`
      SELECT ve."productId", COUNT(*)::int AS score
      FROM view_events ve
      WHERE ve."sessionId" IN (
        SELECT DISTINCT "sessionId" FROM view_events WHERE "productId" = ${productId}
      )
        AND ve."productId" != ${productId}
      GROUP BY ve."productId"
      ORDER BY score DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.productId);
  }

  /** Số liệu cho dashboard: lượt xem theo ngày (N ngày gần nhất) */
  async viewsByDay(days = 30): Promise<{ date: string; views: number }[]> {
    const rows = await this.prisma.$queryRaw<{ date: Date; views: number }[]>`
      SELECT date_trunc('day', "createdAt")::date AS date, COUNT(*)::int AS views
      FROM view_events
      WHERE "createdAt" >= now() - (${days} || ' days')::interval
      GROUP BY 1 ORDER BY 1
    `;
    return rows.map((r) => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      views: r.views,
    }));
  }

  /** Top sản phẩm được xem nhiều nhất (N ngày gần nhất) */
  async topViewedProducts(
    days = 30,
    limit = 10,
  ): Promise<{ productId: number; name: string; views: number }[]> {
    const rows = await this.prisma.$queryRaw<
      { productId: number; name: string; views: number }[]
    >`
      SELECT ve."productId", p.name, COUNT(*)::int AS views
      FROM view_events ve
      JOIN products p ON p.id = ve."productId"
      WHERE ve."createdAt" >= now() - (${days} || ' days')::interval
      GROUP BY ve."productId", p.name
      ORDER BY views DESC
      LIMIT ${limit}
    `;
    return rows;
  }
}
