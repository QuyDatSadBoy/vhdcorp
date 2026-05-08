import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
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
  const title = post.metaTitle ?? post.title;
  const description = post.metaDesc ?? post.excerpt ?? "";
  const ogImage = post.ogImage ?? post.coverImage;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/posts/${post.slug}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.publishedAt ?? undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: ogImage ? [ogImage] : undefined },
    alternates: { canonical: `${SITE_URL}/posts/${post.slug}` },
  };
}

export default async function PostDetailRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await serverApi.postBySlug(slug);

  const articleLd = post ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.coverImage ? [post.coverImage.startsWith("http") ? post.coverImage : `${SITE_URL}${post.coverImage}`] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: post.author?.name ? { "@type": "Person", name: post.author.name } : undefined,
    mainEntityOfPage: `${SITE_URL}/posts/${post.slug}`,
  } : null;

  const breadcrumbLd = post ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: `${SITE_URL}/posts` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/posts/${post.slug}` },
    ],
  } : null;

  return (
    <>
      {articleLd && <JsonLd id="article" data={articleLd} />}
      {breadcrumbLd && <JsonLd id="breadcrumb" data={breadcrumbLd} />}
      <PostDetailClient params={params} />
    </>
  );
}
