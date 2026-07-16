import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tổng quan KPI cho dashboard admin */
  async overview() {
    const [productCount, postCount, userCount, reviewCount, pendingReviews] =
      await Promise.all([
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.post.count({ where: { deletedAt: null } }),
        // "Người dùng" dashboard = KHÁCH HÀNG (client) — không tính admin/staff
        this.prisma.user.count({
          where: { deletedAt: null, role: 'CUSTOMER' },
        }),
        this.prisma.review.count(),
        this.prisma.review.count({ where: { status: 'PENDING' } }),
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
      this.prisma.product.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.post.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = new Map<
      string,
      { date: string; products: number; posts: number; users: number }
    >();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, products: 0, posts: 0, users: 0 });
    }
    const bump = (
      rows: { createdAt: Date }[],
      field: 'products' | 'posts' | 'users',
    ) => {
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        const b = buckets.get(key);
        if (b) b[field] += 1;
      }
    };
    bump(products, 'products');
    bump(posts, 'posts');
    bump(users, 'users');
    return Array.from(buckets.values());
  }

  /** Tỷ trọng sản phẩm theo danh mục cấp 1 (parentId = null), chỉ đếm sản phẩm chưa xoá mềm */
  async categoriesBreakdown() {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        children: { select: { id: true } },
      },
      orderBy: { order: 'asc' },
    });
    // Gom toàn bộ id của root + children — sản phẩm có thể gắn ở bất kỳ cấp nào
    const result = await Promise.all(
      roots.map(async (r) => {
        const ids = [r.id, ...r.children.map((c) => c.id)];
        const count = await this.prisma.product.count({
          where: { deletedAt: null, categoryId: { in: ids } },
        });
        return { id: r.id, name: r.name, slug: r.slug, count };
      }),
    );
    return result.sort((a, b) => b.count - a.count);
  }

  /** Top N sản phẩm có nhiều đánh giá nhất (chỉ tính review đã APPROVED) */
  async topProducts(limit = 6) {
    const n = Math.min(Math.max(limit, 1), 20);
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        _count: { select: { reviews: { where: { status: 'APPROVED' } } } },
      },
    });
    return products
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        stock: p.stock,
        reviews: p._count.reviews,
      }))
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, n);
  }

  /**
   * Xuất báo cáo CSV (UTF-8 BOM để Excel mở tiếng Việt đúng).
   * type: views (lượt xem theo ngày) | top-viewed | contacts | products | orders
   */
  async exportCsv(
    type: string,
    track: {
      viewsByDay(d: number): Promise<{ date: string; views: number }[]>;
      topViewedProducts(
        d: number,
        l: number,
      ): Promise<{ productId: number; name: string; views: number }[]>;
    },
  ): Promise<string> {
    const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const BOM = '\uFEFF';
    if (type === 'top-viewed') {
      const rows = await track.topViewedProducts(30, 50);
      return (
        BOM +
        ['ID san pham,Ten san pham,Luot xem (30 ngay)']
          .concat(
            rows.map((r) => [r.productId, esc(r.name), r.views].join(',')),
          )
          .join('\n')
      );
    }
    if (type === 'contacts') {
      const rows = await this.prisma.contact.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
      return (
        BOM +
        ['ID,Ten,Email,SDT,Tieu de,Trang thai,Thoi gian']
          .concat(
            rows.map((c) =>
              [
                c.id,
                esc(c.name),
                esc(c.email),
                esc(c.phone),
                esc(c.subject),
                c.status,
                c.createdAt.toISOString(),
              ].join(','),
            ),
          )
          .join('\n')
      );
    }
    if (type === 'orders') {
      const rows = await this.prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
      return (
        BOM +
        [
          'Ma don,Khach,Email,SDT,Dia chi,San pham,Tam tinh,Giam,Tong,Voucher,Trang thai,Ngay dat',
        ]
          .concat(
            rows.map((o) =>
              [
                o.code,
                esc(o.name),
                esc(o.email),
                esc(o.phone),
                esc(o.address),
                esc(o.items.map((i) => `${i.name} x${i.qty}`).join('; ')),
                String(o.subtotal),
                String(o.discount),
                String(o.total),
                esc(o.voucherCode),
                o.status,
                o.createdAt.toISOString(),
              ].join(','),
            ),
          )
          .join('\n')
      );
    }
    if (type === 'products') {
      const rows = await this.prisma.product.findMany({
        where: { deletedAt: null },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return (
        BOM +
        ['ID,Ten,Danh muc,Gia,Ton kho,Trang thai,Ngay tao']
          .concat(
            rows.map((p) =>
              [
                p.id,
                esc(p.name),
                esc(p.category?.name),
                String(p.price),
                p.stock,
                p.status,
                p.createdAt.toISOString(),
              ].join(','),
            ),
          )
          .join('\n')
      );
    }
    // mặc định: lượt xem theo ngày
    const rows = await track.viewsByDay(30);
    return (
      BOM +
      ['Ngay,Luot xem']
        .concat(rows.map((r) => [r.date, r.views].join(',')))
        .join('\n')
    );
  }
}
