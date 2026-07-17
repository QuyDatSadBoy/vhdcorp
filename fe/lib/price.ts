import type { Product } from "@/types/domain";

/** Format VND: 25000 → "25.000 ₫" */
export function formatVnd(v: string | number | null | undefined): string {
  return `${Number(v ?? 0).toLocaleString("vi-VN")} ₫`;
}

/**
 * Sản phẩm "Liên hệ báo giá": admin để giá = 0 (hàng dự án/số lượng lớn cần báo giá riêng).
 * Mọi nơi hiển thị giá + nút giỏ hàng phải đi qua check này để đồng bộ 100%.
 */
export function isContactPrice(p: Pick<Product, "price">): boolean {
  return Number(p.price ?? 0) <= 0;
}

/** Giá khuyến mãi còn hiệu lực? (có salePrice > 0 và chưa quá saleEndsAt) */
export function saleActive(p: Pick<Product, "salePrice" | "saleEndsAt">): boolean {
  const sale = Number(p.salePrice ?? 0);
  if (!sale) return false;
  return !p.saleEndsAt || new Date(p.saleEndsAt) > new Date();
}

/** Giá hiệu lực: salePrice khi còn hạn, ngược lại price. */
export function effectivePrice(p: Pick<Product, "price" | "salePrice" | "saleEndsAt">): number {
  return saleActive(p) ? Number(p.salePrice) : Number(p.price);
}

/** % giảm để hiện badge "-x%" — 0 khi không có khuyến mãi */
export function salePercent(p: Pick<Product, "price" | "salePrice" | "saleEndsAt">): number {
  if (!saleActive(p)) return 0;
  const price = Number(p.price);
  if (!price) return 0;
  return Math.round((1 - Number(p.salePrice) / price) * 100);
}
