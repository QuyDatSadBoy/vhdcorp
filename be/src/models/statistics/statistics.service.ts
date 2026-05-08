import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma/prisma.service";

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tổng quan KPI cho dashboard admin */
  async overview() {
    const [productCount, postCount, userCount, reviewCount, pendingReviews] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { status: "PENDING" } }),
    ]);

    return {
      products: productCount,
      posts: postCount,
      users: userCount,
      reviews: reviewCount,
      pendingReviews,
    };
  }

  /** Số bản ghi mới theo ngày trong N ngày qua */
  async timeseries(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const [products, posts, users] = await Promise.all([
      this.prisma.product.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.post.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

    const buckets = new Map<string, { date: string; products: number; posts: number; users: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, products: 0, posts: 0, users: 0 });
    }
    const bump = (rows: { createdAt: Date }[], field: "products" | "posts" | "users") => {
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        const b = buckets.get(key);
        if (b) b[field] += 1;
      }
    };
    bump(products, "products");
    bump(posts, "posts");
    bump(users, "users");
    return Array.from(buckets.values());
  }
}
