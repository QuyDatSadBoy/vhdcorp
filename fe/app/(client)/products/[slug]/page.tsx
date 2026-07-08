import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { stripHtml } from "@/lib/utils";
import ProductDetailClient from "./_components/product-detail-client";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await serverApi.productBySlug(slug);
  if (!product) {
    return { title: "Không tìm thấy sản phẩm" };
  }
  const title = (product.metaTitle?.trim() || product.name).slice(0, 60);
  const description = (
    product.metaDesc?.trim() ||
    product.shortDescription?.trim() ||
    stripHtml(product.description ?? "").trim() ||
    `${product.name} — sản phẩm chính hãng từ VHD Corp, đối tác sản xuất nhựa – cao su – cơ khí công nghiệp uy tín tại Việt Nam.`
  ).slice(0, 160);
  const ogImage = product.ogImage ?? product.images?.[0];
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/products/${product.slug}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: ogImage ? [ogImage] : undefined },
    alternates: { canonical: `${SITE_URL}/products/${product.slug}` },
  };
}

export default async function ProductDetailRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await serverApi.productBySlug(slug);

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
                price: Number(product.price),
                availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                url: `${SITE_URL}/products/${product.slug}`,
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
