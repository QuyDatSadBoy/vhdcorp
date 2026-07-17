import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 1 sản phẩm trong danh sách yêu cầu báo giá (sản phẩm giá = 0 — "Liên hệ báo giá") */
export interface QuoteItem {
  productId: number;
  slug: string;
  name: string;
  image: string;
}

interface QuoteState {
  items: QuoteItem[];
  add: (item: QuoteItem) => void;
  remove: (productId: number) => void;
  clear: () => void;
  has: (productId: number) => boolean;
}

/**
 * Danh sách báo giá — giống giỏ hàng nhưng cho sản phẩm cần báo giá riêng:
 * khách gom nhiều sản phẩm rồi gửi MỘT yêu cầu ở trang Liên hệ (đỡ phải gửi từng cái).
 */
export const useQuoteStore = create<QuoteState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => (s.items.some((i) => i.productId === item.productId) ? s : { items: [...s.items, item] })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some((i) => i.productId === productId),
    }),
    { name: "vhd_quote_list" }
  )
);
