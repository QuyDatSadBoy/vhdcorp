import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@prisma/prisma.service";
import { CreateBannerDto, UpdateBannerDto } from "./dto/banner.dto";

@Injectable()
export class BannerService {
  constructor(private prisma: PrismaService) {}

  list(params: { position?: string; activeOnly?: boolean }) {
    return this.prisma.banner.findMany({
      where: {
        ...(params.position ? { position: params.position } : {}),
        ...(params.activeOnly ? { active: true } : {}),
      },
      orderBy: { order: "asc" },
    });
  }

  async findById(id: number) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException("Không tìm thấy banner");
    return b;
  }

  create(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  async update(id: number, dto: UpdateBannerDto) {
    await this.findById(id);
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findById(id);
    return this.prisma.banner.delete({ where: { id } });
  }
}
