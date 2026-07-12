import type { PaginatedResult, Product } from "@/types/domain";
import { getSiteConfig } from "@/lib/site-config";
import { PageRenderer } from "@/components/sections";
import ProductsPageClient from "./_components/products-page-client";

// Metadata (buildMetadata + canonical /products) đã khai báo tại ./layout.tsx.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Fetch trang 1 server-side để link sản phẩm có trong HTML đầu (crawlable). */
async function getInitialProducts(): Promise<PaginatedResult<Product> | undefined> {
  try {
    const res = await fetch(`${API_URL}/products?pageNumber=1&pageSize=24&sort=newest`, {
      cache: "no-store", // real-time: admin sửa là thấy ngay
    });
    if (!res.ok) return undefined;
    const json: { data?: PaginatedResult<Product> } = await res.json();
    return json.data ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function ProductsPage() {
  const [initialData, config] = await Promise.all([getInitialProducts(), getSiteConfig()]);
  // Page Builder: section admin cấu hình cho trang Sản phẩm — render phía trên danh sách
  const sections = config.pages?.products?.sections ?? [];
  return (
    <>
      {sections.length > 0 && <PageRenderer sections={sections} />}
      <ProductsPageClient initialData={initialData} />
    </>
  );
}
