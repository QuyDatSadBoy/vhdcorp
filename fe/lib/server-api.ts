import "server-only";
import type { PaginatedResult, Product, Post, Category } from "@/types/domain";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface Envelope<T> {
  statusCode: number;
  success: boolean;
  data: T;
  message?: string;
}

// Cache dữ liệu (Data Cache) theo TAG + fallback 5 phút. BE gọi /api/revalidate
// theo tag khi admin sửa → cập nhật NGAY, còn bình thường phục vụ từ cache (siêu nhanh).
async function getJson<T>(path: string, tags: string[] = []): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { tags, revalidate: 300 } });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<T>;
    return json.data;
  } catch {
    return null;
  }
}

export const serverApi = {
  productBySlug: (slug: string) => getJson<Product>(`/products/slug/${slug}`, ["products"]),
  postBySlug: (slug: string) => getJson<Post>(`/posts/slug/${slug}`, ["posts"]),
  products: (params?: { pageSize?: number }) =>
    getJson<PaginatedResult<Product>>(`/products${params?.pageSize ? `?pageSize=${params.pageSize}` : ""}`, [
      "products",
    ]),
  categoryBySlug: (slug: string) => getJson<Category>(`/categories/slug/${slug}`, ["categories"]),
  categories: () => getJson<Category[]>(`/categories?includeChildren=true`, ["categories"]),
  productsByCategorySlug: (slug: string, pageSize = 24) =>
    getJson<PaginatedResult<Product>>(`/products?categorySlug=${encodeURIComponent(slug)}&pageSize=${pageSize}`, [
      "products",
    ]),
};
