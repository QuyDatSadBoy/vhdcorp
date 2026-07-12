import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { serverApi } from "@/lib/server-api";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { PageHero } from "@/components/client/page-hero";
import { CategoryProductsClient } from "./_components/category-products-client";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await serverApi.categoryBySlug(slug);
  if (!category) {
    return buildMetadata({ title: "Không tìm thấy danh mục", noindex: true });
  }
  return buildMetadata({
    title: category.metaTitle?.trim() || category.name,
    description:
      category.metaDesc?.trim() ||
      category.description?.trim() ||
      `Khám phá toàn bộ sản phẩm thuộc danh mục ${category.name} của VHD Corp.`,
    canonical: `${SITE_URL}/categories/${category.slug}`,
    image: category.ogImage ?? category.image ?? undefined,
  });
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [category, productsResult] = await Promise.all([
    serverApi.categoryBySlug(slug),
    serverApi.productsByCategorySlug(slug, 24),
  ]);

  if (!category) {
    // 404 server-side để crawler/Slack/FB nhận đúng status
    notFound();
  }

  const initialProducts = productsResult?.records ?? [];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sản phẩm", item: `${SITE_URL}/products` },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${SITE_URL}/categories/${category.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd id="category-breadcrumb" data={breadcrumbLd} />
      <PageHero
        eyebrow="Danh mục sản phẩm"
        title={category.name}
        description={category.description ?? `Khám phá toàn bộ sản phẩm thuộc danh mục ${category.name} của VHD Corp.`}
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/products" },
          { label: category.name },
        ]}
      />
      <div className="container mx-auto px-4 py-12">
        <CategoryProductsClient slug={slug} initialProducts={initialProducts} />
        <div className="mt-12 flex justify-center">
          <Link
            href="/categories"
            className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
          >
            ← Xem tất cả danh mục
          </Link>
        </div>
      </div>
    </>
  );
}
