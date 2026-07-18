import type { PaginatedResult, Post } from "@/types/domain";
import { getSiteConfig } from "@/lib/site-config";
import { PageRenderer } from "@/components/sections";
import PostsPageClient from "./_components/posts-page-client";

// Metadata (buildMetadata + canonical /posts) đã khai báo tại ./layout.tsx.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Fetch trang 1 server-side để link bài viết có trong HTML đầu (crawlable). */
async function getInitialPosts(): Promise<PaginatedResult<Post> | undefined> {
  try {
    const res = await fetch(`${API_URL}/posts?pageNumber=1&pageSize=24`, {
      next: { tags: ["posts"], revalidate: 300 }, // cache + BE revalidate khi sửa
    });
    if (!res.ok) return undefined;
    const json: { data?: PaginatedResult<Post> } = await res.json();
    return json.data ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function PostsPage() {
  const [initialData, config] = await Promise.all([getInitialPosts(), getSiteConfig()]);
  // Page Builder: section admin cấu hình cho trang Tin tức — render phía trên danh sách
  const sections = config.pages?.posts?.sections ?? [];
  return (
    <>
      {sections.length > 0 && <PageRenderer sections={sections} />}
      <PostsPageClient initialData={initialData} />
    </>
  );
}
