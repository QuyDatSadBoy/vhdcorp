import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { SlugService } from '@service/slug/slug.service';
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
    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        stock: dto.stock ?? 0,
        images: dto.images,
        categoryId: dto.categoryId,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        status: dto.status ?? ProductStatus.DRAFT,
      },
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findById(id);
    let slug: string | undefined;
    if (dto.slug)
      slug = await this.slug.generateUniqueSlug(dto.slug, 'product', id);
    else if (dto.name)
      slug = await this.slug.generateUniqueSlug(dto.name, 'product', id);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        images: dto.images,
        categoryId: dto.categoryId,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        status: dto.status,
      },
    });
  }

  async softDelete(id: number) {
    await this.findById(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
