-- Sản phẩm nổi bật / bán chạy + bài viết nổi bật (admin tự bật) — hiện lên đầu / slider
ALTER TABLE "products" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "isBestSeller" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "posts" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");
CREATE INDEX "products_isBestSeller_idx" ON "products"("isBestSeller");
CREATE INDEX "posts_isFeatured_idx" ON "posts"("isFeatured");
