import type { MetadataRoute } from "next";
import axios from "axios";
import type { PaginatedResult, Product, Post, Category } from "@/types/domain";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

const api = axios.create({ baseURL: API_URL });

// Re-generate sitemap mỗi 60s thay vì cache vĩnh viễn ở build time
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = ["", "/products", "/posts", "/about", "/contact"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  try {
    const [products, posts, categories] = await Promise.all([
      api
        .get<{ data: PaginatedResult<Product> }>("/products", { params: { pageSize: 500 } })
        .then((r) => r.data.data?.records ?? []),
      api
        .get<{ data: PaginatedResult<Post> }>("/posts", { params: { pageSize: 500 } })
        .then((r) => r.data.data?.records ?? []),
      api.get<{ data: Category[] }>("/categories").then((r) => r.data.data ?? []),
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${SITE_URL}/posts/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    }));
    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticEntries, ...productEntries, ...postEntries, ...categoryEntries];
  } catch {
    return staticEntries;
  }
}
