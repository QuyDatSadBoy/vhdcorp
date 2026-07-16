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

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
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
    }),
    { name: "vhd_cart" }
  )
);

/** Tổng số sản phẩm trong giỏ (badge header) */
export const selectCartCount = (s: CartState) => s.items.reduce((sum, i) => sum + i.qty, 0);

/** Tạm tính theo giá hiệu lực từng dòng */
export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + (i.salePrice ?? i.price) * i.qty, 0);
