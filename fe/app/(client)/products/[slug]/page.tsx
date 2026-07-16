import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import type { Review } from "@/types/domain";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo";
import { stripHtml } from "@/lib/utils";
import ProductDetailClient from "./_components/product-detail-client";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Fetch review đã duyệt server-side để JSON-LD Product có aggregateRating ngay trong HTML đầu. */
async function getProductReviews(slug: string): Promise<Review[]> {
  try {
    const res = await fetch(`${API_URL}/reviews/product/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json: { data?: Review[] } = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await serverApi.productBySlug(slug);
  if (!product) {
    return { title: "Không tìm thấy sản phẩm" };
  }
  const description =
    product.metaDesc?.trim() ||
    product.shortDescription?.trim() ||
    stripHtml(product.description ?? "").trim() ||
    `${product.name} — sản phẩm chính hãng từ VHD Corp, đối tác sản xuất nhựa – cao su – cơ khí công nghiệp uy tín tại Việt Nam.`;
  // buildMetadata áp titleTemplate từ SiteConfig + OG/Twitter/robots đầy đủ
  return buildMetadata({
    title: product.metaTitle?.trim() || product.name,
    description,
    canonical: `${SITE_URL}/products/${product.slug}`,
    image: product.ogImage ?? product.images?.[0],
    type: "product",
  });
}

export default async function ProductDetailRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [product, reviews] = await Promise.all([serverApi.productBySlug(slug), getProductReviews(slug)]);

  const productLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription ?? product.description,
        image: (product.images ?? []).map((src) => (src.startsWith("http") ? src : `${SITE_URL}${src}`)),
        sku: String(product.id),
        category: product.category?.name,
        offers:
          Number(product.price) > 0
            ? {
                "@type": "Offer",
                priceCurrency: "VND",
                // Giá hiệu lực = giá KM khi còn hạn (đồng bộ hiển thị) — Google đọc đúng giá bán
                price:
                  product.salePrice && (!product.saleEndsAt || new Date(product.saleEndsAt) > new Date())
                    ? Number(product.salePrice)
                    : Number(product.price),
                ...(product.salePrice && product.saleEndsAt && new Date(product.saleEndsAt) > new Date()
                  ? { priceValidUntil: new Date(product.saleEndsAt).toISOString().slice(0, 10) }
                  : {}),
                availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                url: `${SITE_URL}/products/${product.slug}`,
              }
            : undefined,
        aggregateRating:
          reviews.length > 0
            ? {
                "@type": "AggregateRating",
                ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
                reviewCount: reviews.length,
              }
            : undefined,
      }
    : null;

  const breadcrumbLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Sản phẩm", item: `${SITE_URL}/products` },
          ...(product.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: product.category.name,
                  item: `${SITE_URL}/categories/${product.category.slug}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: product.category ? 4 : 3,
            name: product.name,
            item: `${SITE_URL}/products/${product.slug}`,
          },
        ],
      }
    : null;

  return (
    <>
      {productLd && <JsonLd id="product" data={productLd} />}
      {breadcrumbLd && <JsonLd id="breadcrumb" data={breadcrumbLd} />}
      <ProductDetailClient params={params} />
    </>
  );
}
