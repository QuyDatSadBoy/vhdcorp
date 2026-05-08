import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@prisma/prisma.service";
import { ConfigStatus, type Prisma } from "@vhd/prisma-client";
import { UpdateSiteConfigDto } from "./dto/site-config.dto";

@Injectable()
export class SiteConfigService {
  constructor(private prisma: PrismaService) {}

  /** Public: chỉ trả PUBLISHED */
  async getPublished(key = "main") {
    const config = await this.prisma.siteConfig.findFirst({
      where: { key, status: ConfigStatus.PUBLISHED },
      orderBy: { updatedAt: "desc" },
    });
    if (!config) throw new NotFoundException(`SiteConfig "${key}" chưa được publish`);
    return config;
  }

  /** Admin: lấy bản đang chỉnh sửa (DRAFT) hoặc tạo từ PUBLISHED */
  async getDraft(key = "main", userId: number) {
    let draft = await this.prisma.siteConfig.findFirst({
      where: { key, status: ConfigStatus.DRAFT },
      orderBy: { updatedAt: "desc" },
    });
    if (draft) return draft;

    const published = await this.prisma.siteConfig.findFirst({
      where: { key, status: ConfigStatus.PUBLISHED },
      orderBy: { version: "desc" },
    });
    if (!published) {
      throw new NotFoundException(`SiteConfig "${key}" chưa tồn tại — chạy seed`);
    }
    draft = await this.prisma.siteConfig.create({
      data: {
        key,
        value: published.value as Prisma.InputJsonValue,
        version: published.version + 1,
        status: ConfigStatus.DRAFT,
        updatedBy: userId,
      },
    });
    return draft;
  }

  /** Lưu DRAFT */
  async saveDraft(key: string, userId: number, dto: UpdateSiteConfigDto) {
    const draft = await this.prisma.siteConfig.findFirst({
      where: { key, status: ConfigStatus.DRAFT },
    });
    if (draft) {
      return this.prisma.siteConfig.update({
        where: { id: draft.id },
        data: { value: dto.value as Prisma.InputJsonValue, updatedBy: userId },
      });
    }
    const latest = await this.prisma.siteConfig.findFirst({
      where: { key },
      orderBy: { version: "desc" },
    });
    return this.prisma.siteConfig.create({
      data: {
        key,
        value: dto.value as Prisma.InputJsonValue,
        version: (latest?.version ?? 0) + 1,
        status: ConfigStatus.DRAFT,
        updatedBy: userId,
      },
    });
  }

  /** Publish: snapshot hiện tại vào history, đổi DRAFT thành PUBLISHED */
  async publish(key: string, userId: number) {
    const draft = await this.prisma.siteConfig.findFirst({
      where: { key, status: ConfigStatus.DRAFT },
      orderBy: { updatedAt: "desc" },
    });
    if (!draft) throw new NotFoundException("Không có DRAFT để publish");

    return this.prisma.$transaction(async (tx) => {
      // SiteConfig có @@unique([key, status]) nên không thể có 2 bản DRAFT/PUBLISHED.
      // Cách an toàn (giữ FK history.configId): snapshot value cũ vào history,
      // ghi đè PUBLISHED hiện tại bằng nội dung của draft, rồi xóa draft.
      const currentPublished = await tx.siteConfig.findFirst({
        where: { key, status: ConfigStatus.PUBLISHED },
      });
      if (currentPublished) {
        await tx.siteConfigHistory.create({
          data: {
            configId: currentPublished.id,
            snapshot: currentPublished.value as Prisma.InputJsonValue,
            version: currentPublished.version,
            savedBy: userId,
          },
        });
        const published = await tx.siteConfig.update({
          where: { id: currentPublished.id },
          data: {
            value: draft.value as Prisma.InputJsonValue,
            version: currentPublished.version + 1,
            updatedBy: userId,
          },
        });
        await tx.siteConfig.delete({ where: { id: draft.id } });
        return published;
      }
      // Chưa có PUBLISHED nào → promote thẳng draft.
      return tx.siteConfig.update({
        where: { id: draft.id },
        data: { status: ConfigStatus.PUBLISHED, updatedBy: userId },
      });
    });
  }

  /** Lịch sử cho timeline UI builder */
  async history(key: string) {
    const config = await this.prisma.siteConfig.findFirst({ where: { key } });
    if (!config) return [];
    return this.prisma.siteConfigHistory.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /** Rollback về 1 phiên bản history */
  async rollback(historyId: number, userId: number) {
    const history = await this.prisma.siteConfigHistory.findUnique({ where: { id: historyId } });
    if (!history) throw new NotFoundException("Không tìm thấy phiên bản");

    const config = await this.prisma.siteConfig.findUnique({ where: { id: history.configId } });
    if (!config) throw new NotFoundException("Config gốc không tồn tại");

    return this.saveDraft(config.key, userId, {
      value: history.snapshot as Record<string, unknown>,
    });
  }
}
