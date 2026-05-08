import "server-only";
import type { PaginatedResult, Product, Post } from "@/types/domain";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface Envelope<T> {
  statusCode: number;
  success: boolean;
  data: T;
  message?: string;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<T>;
    return json.data;
  } catch {
    return null;
  }
}

export const serverApi = {
  productBySlug: (slug: string) => getJson<Product>(`/products/slug/${slug}`),
  postBySlug: (slug: string) => getJson<Post>(`/posts/slug/${slug}`),
  products: (params?: { pageSize?: number }) =>
    getJson<PaginatedResult<Product>>(
      `/products${params?.pageSize ? `?pageSize=${params.pageSize}` : ""}`,
    ),
};
