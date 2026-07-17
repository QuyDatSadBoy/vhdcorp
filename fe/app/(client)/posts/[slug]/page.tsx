import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo";
import PostDetailClient from "./_components/post-detail-client";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await serverApi.postBySlug(slug);
  if (!post) {
    return { title: "Không tìm thấy bài viết" };
  }
  const description =
    post.metaDesc?.trim() ||
    post.excerpt?.trim() ||
    `${post.title} — Tin tức, kiến thức ngành điện lạnh, cơ điện và khuôn mẫu, đúc nhựa từ VHD Corp.`;
  // buildMetadata áp titleTemplate SiteConfig; bổ sung publishedTime cho OG article
  const base = await buildMetadata({
    title: post.metaTitle?.trim() || post.title,
    description,
    canonical: `${SITE_URL}/posts/${post.slug}`,
    image: post.ogImage ?? post.coverImage ?? undefined,
    type: "article",
  });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.publishedAt ?? undefined },
  };
}

export default async function PostDetailRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await serverApi.postBySlug(slug);

  const articleLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        image: post.coverImage
          ? [post.coverImage.startsWith("http") ? post.coverImage : `${SITE_URL}${post.coverImage}`]
          : undefined,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        author: post.author?.name ? { "@type": "Person", name: post.author.name } : undefined,
        mainEntityOfPage: `${SITE_URL}/posts/${post.slug}`,
      }
    : null;

  const breadcrumbLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tin tức", item: `${SITE_URL}/posts` },
          { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/posts/${post.slug}` },
        ],
      }
    : null;

  return (
    <>
      {articleLd && <JsonLd id="article" data={articleLd} />}
      {breadcrumbLd && <JsonLd id="breadcrumb" data={breadcrumbLd} />}
      <PostDetailClient params={params} />
    </>
  );
}
