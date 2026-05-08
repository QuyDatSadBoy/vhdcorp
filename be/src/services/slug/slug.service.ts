import { Injectable } from "@nestjs/common";
import slugify from "slugify";
import { PrismaService } from "@prisma/prisma.service";

type SluggableModel = "category" | "product" | "post";

/**
 * SlugService — sinh slug duy nhất theo domain.
 * Nếu slug đã tồn tại, thêm hậu tố `-2`, `-3`, ... cho đến khi unique.
 */
@Injectable()
export class SlugService {
  constructor(private prisma: PrismaService) {}

  async generateUniqueSlug(
    text: string,
    model: SluggableModel,
    currentId?: number,
  ): Promise<string> {
    const base = slugify(text, { lower: true, strict: true, locale: "vi" });
    let candidate = base || "item";
    let counter = 2;

    while (await this.exists(model, candidate, currentId)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    return candidate;
  }

  private async exists(
    model: SluggableModel,
    slug: string,
    currentId?: number,
  ): Promise<boolean> {
    const where = currentId ? { slug, NOT: { id: currentId } } : { slug };
    const found =
      model === "category"
        ? await this.prisma.category.findFirst({ where })
        : model === "product"
          ? await this.prisma.product.findFirst({ where })
          : await this.prisma.post.findFirst({ where });
    return found !== null;
  }
}
