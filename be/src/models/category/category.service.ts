import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { SlugService } from '@service/slug/slug.service';
import { AgentService } from '@service/agent/agent.service';
import type { Category, Prisma } from '@vhd/prisma-client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private slug: SlugService,
    private agent: AgentService,
  ) {}

  async list(params: {
    search?: string;
    parentId?: number | null;
    includeChildren?: boolean;
  }) {
    const where: Prisma.CategoryWhereInput = {};
    if (params.search)
      where.name = { contains: params.search, mode: 'insensitive' };
    if (params.parentId !== undefined) where.parentId = params.parentId;

    return this.prisma.category.findMany({
      where,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: params.includeChildren
        ? { children: { orderBy: { order: 'asc' } } }
        : undefined,
    });
  }

  /** Lấy cây danh mục đầy đủ (chỉ dùng cho admin/builder) */
  async tree(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { order: 'asc' },
      include: {
        children: { orderBy: { order: 'asc' }, include: { children: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true, parent: true },
    });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    return cat;
  }

  async findById(id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    return cat;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug
      ? await this.slug.generateUniqueSlug(dto.slug, 'category')
      : await this.slug.generateUniqueSlug(dto.name, 'category');

    const created = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        image: dto.image,
        description: dto.description,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        parentId: dto.parentId ?? null,
        order: dto.order ?? 0,
      },
    });
    this.agent.notifyProductsChanged(); // tên danh mục nằm trong catalog chat AI
    return created;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    await this.findById(id);
    let slug: string | undefined;
    if (dto.slug)
      slug = await this.slug.generateUniqueSlug(dto.slug, 'category', id);
    else if (dto.name)
      slug = await this.slug.generateUniqueSlug(dto.name, 'category', id);

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        image: dto.image,
        description: dto.description,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        ogImage: dto.ogImage,
        parentId: dto.parentId,
        order: dto.order,
      },
    });
    this.agent.notifyProductsChanged();
    return updated;
  }

  async delete(id: number): Promise<void> {
    // Category không soft delete — chỉ xóa nếu không có sản phẩm + không có con
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, products: { take: 1 } },
    });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    if (cat.children.length > 0) {
      throw new NotFoundException('Vẫn còn danh mục con — hãy xóa con trước');
    }
    if (cat.products.length > 0) {
      throw new NotFoundException(
        'Danh mục đang có sản phẩm — hãy chuyển sản phẩm trước',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    this.agent.notifyProductsChanged();
  }
}
