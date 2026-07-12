import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { ReviewStatus, type Prisma } from '@vhd/prisma-client';
import {
  CreateReviewDto,
  UpdateReviewDto,
  UpdateReviewStatusDto,
} from './dto/review.dto';
import { buildPaginationParams, toPaginated } from '@util/pagination';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async listForProduct(productSlug: string) {
    return this.prisma.review.findMany({
      where: { product: { slug: productSlug }, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async adminList(params: {
    pageNumber?: string;
    pageSize?: string;
    page?: string;
    limit?: string;
    status?: ReviewStatus;
    productId?: number;
  }) {
    const { page, limit, skip, take } = buildPaginationParams(
      params.pageNumber,
      params.pageSize,
      params.page,
      params.limit,
    );
    const where: Prisma.ReviewWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.productId) where.productId = params.productId;

    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return toPaginated(records, totalItems, page, limit);
  }

  async create(userId: number, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId: dto.productId, userId } },
    });
    if (existing) throw new ConflictException('Bạn đã đánh giá sản phẩm này');

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        content: dto.content,
        status: ReviewStatus.PENDING,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.userId !== userId)
      throw new NotFoundException('Không có quyền sửa đánh giá này');
    return this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        content: dto.content,
        status: ReviewStatus.PENDING,
      },
    });
  }

  async setStatus(id: number, dto: UpdateReviewStatusDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.prisma.review.delete({ where: { id } });
  }
}
