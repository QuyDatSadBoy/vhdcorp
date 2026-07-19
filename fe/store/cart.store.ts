import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 1 dòng trong giỏ — snapshot đủ để hiển thị, giá cuối luôn tính lại server-side khi đặt */
export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  /** Giá KM tại thời điểm thêm (hiển thị); null = không KM */
  salePrice: number | null;
  qty: number;
  stock: number;
}

/** Dữ liệu tươi từ server để đối chiếu giỏ (GET /products/by-slugs) */
export interface FreshProduct {
  slug: string;
  name: string;
  images: string[];
  price: string | number;
  salePrice?: string | number | null;
  saleEndsAt?: string | null;
  stock: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  /**
   * Đồng bộ giỏ với dữ liệu server: sản phẩm ĐÃ XOÁ/ngừng bán bị loại khỏi giỏ,
   * sản phẩm còn bán được làm tươi tên/ảnh/giá/tồn kho. Trả về số dòng bị loại.
   */
  syncWithServer: (fresh: FreshProduct[]) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existed = s.items.find((i) => i.productId === item.productId);
          if (existed) {
            return {
              items: s.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, ...item, qty: Math.min(i.qty + qty, i.stock > 0 ? i.stock : 999) }
                  : i
              ),
            };
          }
          return { items: [...s.items, { ...item, qty }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.productId !== productId)
              : s.items.map((i) =>
                  i.productId === productId ? { ...i, qty: Math.min(qty, i.stock > 0 ? i.stock : 999) } : i
                ),
        })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      syncWithServer: (fresh) => {
        let removed = 0;
        set((s) => {
          const bySlug = new Map(fresh.map((p) => [p.slug, p]));
          const next: CartItem[] = [];
          for (const item of s.items) {
            const f = bySlug.get(item.slug);
            if (!f) {
              removed += 1; // đã xoá / ngừng bán → loại khỏi giỏ
              continue;
            }
            const saleOk = f.salePrice != null && (!f.saleEndsAt || new Date(f.saleEndsAt) > new Date());
            next.push({
              ...item,
              name: f.name,
              image: f.images?.[0] ?? item.image,
              price: Number(f.price),
              salePrice: saleOk ? Number(f.salePrice) : null,
              stock: f.stock,
              qty: f.stock > 0 ? Math.min(item.qty, f.stock) : item.qty,
            });
          }
          return { items: next };
        });
        return removed;
      },
    }),
    { name: "vhd_cart" }
  )
);

/** Tổng số sản phẩm trong giỏ (badge header) */
export const selectCartCount = (s: CartState) => s.items.reduce((sum, i) => sum + i.qty, 0);

/** Tạm tính theo giá hiệu lực từng dòng */
export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + (i.salePrice ?? i.price) * i.qty, 0);
