import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { SlugService } from '@service/slug/slug.service';
import { AgentService } from '@service/agent/agent.service';
import { ProductStatus, type Prisma } from '@vhd/prisma-client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { buildPaginationParams, toPaginated } from '@util/pagination';

interface ListParams {
  pageNumber?: string | number;
  pageSize?: string | number;
  /** Alias REST chuẩn cho `pageNumber`. */
  page?: string | number;
  /** Alias REST chuẩn cho `pageSize`. */
  limit?: string | number;
  search?: string;
  categorySlug?: string;
  categoryId?: number;
  status?: ProductStatus;
  publishedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name';
}

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private slug: SlugService,
    private agent: AgentService,
  ) {}

  async list(params: ListParams) {
    const { page, limit, skip, take } = buildPaginationParams(
      params.pageNumber,
      params.pageSize,
      params.page,
      params.limit,
    );

    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (params.publishedOnly) where.status = ProductStatus.PUBLISHED;
    else if (params.status) where.status = params.status;
    if (params.search) {
      // Match cả name (có dấu) và slug (đã bỏ dấu) — hỗ trợ tìm kiếm tiếng Việt không dấu
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        {
          slug: { contains: params.search.toLowerCase(), mode: 'insensitive' },
        },
      ];
    }
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.categorySlug) where.category = { slug: params.categorySlug };
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined)
        (where.price as Prisma.DecimalFilter).gte = params.minPrice;
      if (params.maxPrice !== undefined)
        (where.price as Prisma.DecimalFilter).lte = params.maxPrice;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      params.sort === 'price_asc'
        ? { price: 'asc' }
        : params.sort === 'price_desc'
          ? { price: 'desc' }
          : params.sort === 'name'
            ? { name: 'asc' }
            : { createdAt: 'desc' };

    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return toPaginated(records, totalItems, page, limit);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null, status: ProductStatus.PUBLISHED },
      include: {
        category: true,
        reviews: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  async findById(id: number, options: { includeDeleted?: boolean } = {}) {
    const where: { id: number; deletedAt?: null } = { id };
    if (!options.includeDeleted) where.deletedAt = null;
    const product = await this.prisma.product.findFirst({
      where,
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  /** Lấy nhiều sản phẩm PUBLISHED theo danh sách id — giữ nguyên thứ tự truyền vào */
  async findManyPublishedByIds(ids: number[]) {
    if (ids.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    return products.sort(
      (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
    );
  }

  /** Sản phẩm liên quan: cùng category, khác id, PUBLISHED */
  async related(productId: number, take = 8) {
    const current = await this.findById(productId);
    return this.prisma.product.findMany({
      where: {
        id: { not: productId },
        categoryId: current.categoryId,
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      take,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async create(dto: CreateProductDto) {
    const slug = await this.slug.generateUniqueSlug(
      dto.slug ?? dto.name,
      'product',
    );
    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        salePrice: dto.salePrice || null,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
        stock: dto.stock ?? 0,
        images: dto.images,
        categoryId: dto.categoryId,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        status: dto.status ?? ProductStatus.DRAFT,
      },
    });
    this.agent.notifyProductsChanged(); // chat AI thấy sản phẩm mới ngay lập tức
    return created;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findById(id);
    let slug: string | undefined;
    if (dto.slug)
      slug = await this.slug.generateUniqueSlug(dto.slug, 'product', id);
    else if (dto.name)
      slug = await this.slug.generateUniqueSlug(dto.name, 'product', id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        salePrice:
          dto.salePrice !== undefined ? dto.salePrice || null : undefined,
        saleEndsAt:
          dto.saleEndsAt !== undefined
            ? dto.saleEndsAt
              ? new Date(dto.saleEndsAt)
              : null
            : undefined,
        stock: dto.stock,
        images: dto.images,
        categoryId: dto.categoryId,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        status: dto.status,
      },
    });
    this.agent.notifyProductsChanged();
    return updated;
  }

  /**
   * Autocomplete: khớp tên/mô tả/danh mục KHÔNG DẤU (unaccent) — trả top 6
   * kèm giá + giá KM + ảnh để render dropdown gợi ý.
   */
  async suggest(q: string) {
    const query = q.trim();
    if (query.length < 1) return [];
    const like = `%${query}%`;
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        slug: string;
        name: string;
        price: unknown;
        salePrice: unknown;
        saleEndsAt: Date | null;
        images: string[];
        category_name: string | null;
      }[]
    >`
      SELECT p.id, p.slug, p.name, p.price, p."salePrice", p."saleEndsAt", p.images,
             c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      WHERE p.status = 'PUBLISHED' AND p."deletedAt" IS NULL
        AND (
          unaccent(lower(p.name)) LIKE unaccent(lower(${like}))
          OR unaccent(lower(c.name)) LIKE unaccent(lower(${like}))
          OR unaccent(lower(p.description)) LIKE unaccent(lower(${like}))
        )
      ORDER BY (unaccent(lower(p.name)) LIKE unaccent(lower(${like}))) DESC, p."createdAt" DESC
      LIMIT 6
    `;
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      price: r.price,
      salePrice: r.salePrice,
      saleEndsAt: r.saleEndsAt,
      image: r.images?.[0] ?? '',
      category: r.category_name ?? '',
    }));
  }

  async softDelete(id: number) {
    await this.findById(id);
    const deleted = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.agent.notifyProductsChanged();
    return deleted;
  }

  async restore(id: number) {
    const restored = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    });
    this.agent.notifyProductsChanged();
    return restored;
  }
}
