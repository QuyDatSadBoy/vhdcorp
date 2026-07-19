import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { SlugService } from '@service/slug/slug.service';
import { PostStatus, type Prisma } from '@vhd/prisma-client';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { buildPaginationParams, toPaginated } from '@util/pagination';
import { revalidateFe } from '@util/revalidate';

interface ListParams {
  pageNumber?: string | number;
  pageSize?: string | number;
  /** Alias REST chuẩn cho `pageNumber`. */
  page?: string | number;
  /** Alias REST chuẩn cho `pageSize`. */
  limit?: string | number;
  search?: string;
  tag?: string;
  status?: PostStatus;
  publishedOnly?: boolean;
  /** Chỉ lấy bài viết nổi bật (admin bật). */
  featured?: boolean;
}

@Injectable()
export class PostService {
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

    const where: Prisma.PostWhereInput = { deletedAt: null };
    if (params.publishedOnly) {
      where.status = PostStatus.PUBLISHED;
      where.publishedAt = { lte: new Date() };
    } else if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        {
          slug: { contains: params.search.toLowerCase(), mode: 'insensitive' },
        },
      ];
    }
    if (params.tag) where.tags = { has: params.tag };
    if (params.featured) where.isFeatured = true;

    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: { author: { select: { id: true, name: true, avatar: true } } },
      }),
      this.prisma.post.count({ where }),
    ]);
    return toPaginated(records, totalItems, page, limit);
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, deletedAt: null, status: PostStatus.PUBLISHED },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return post;
  }

  async findById(id: number, options: { includeDeleted?: boolean } = {}) {
    const where: { id: number; deletedAt?: null } = { id };
    if (!options.includeDeleted) where.deletedAt = null;
    const post = await this.prisma.post.findFirst({
      where,
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return post;
  }

  async create(dto: CreatePostDto, authorId: number) {
    const slug = await this.slug.generateUniqueSlug(
      dto.slug ?? dto.title,
      'post',
    );
    const status = dto.status ?? PostStatus.DRAFT;
    const publishedAt =
      status === PostStatus.PUBLISHED
        ? dto.publishedAt
          ? new Date(dto.publishedAt)
          : new Date()
        : dto.publishedAt
          ? new Date(dto.publishedAt)
          : null;

    const created = await this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt,
        coverImage: dto.coverImage,
        status,
        publishedAt,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        tags: dto.tags ?? [],
        isFeatured: dto.isFeatured ?? false,
        authorId,
      },
    });
    revalidateFe('posts');
    return created;
  }

  async update(id: number, dto: UpdatePostDto) {
    const current = await this.findById(id);
    let slug: string | undefined;
    if (dto.slug)
      slug = await this.slug.generateUniqueSlug(dto.slug, 'post', id);
    else if (dto.title)
      slug = await this.slug.generateUniqueSlug(dto.title, 'post', id);

    // Tự đóng dấu publishedAt khi chuyển DRAFT → PUBLISHED mà DTO không cung cấp
    let publishedAt: Date | undefined;
    if (dto.publishedAt) publishedAt = new Date(dto.publishedAt);
    else if (dto.status === PostStatus.PUBLISHED && !current.publishedAt)
      publishedAt = new Date();

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt,
        coverImage: dto.coverImage,
        status: dto.status,
        publishedAt,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        tags: dto.tags,
        isFeatured: dto.isFeatured,
      },
    });
    revalidateFe('posts');
    return updated;
  }

  async softDelete(id: number) {
    await this.findById(id);
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number) {
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
