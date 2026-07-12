import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

/**
 * On-demand revalidation endpoint.
 * Sau khi admin publish SiteConfig, BE (hoặc admin UI) gọi:
 *   POST /api/revalidate?tag=site-config
 *   Header: x-revalidate-secret: <REVALIDATE_SECRET>
 * Hoặc:
 *   POST /api/revalidate?path=/products/abc
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET ?? "vhdcorp-revalidate";
  const provided = req.headers.get("x-revalidate-secret") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get("tag");
  const path = req.nextUrl.searchParams.get("path");
  const revalidated: string[] = [];

  // { expire: 0 } = hết hạn CỨNG: lượt xem đầu tiên sau publish đã là bản mới.
  // (profile "default" là stale-while-revalidate — lượt đầu vẫn trả bản cũ.)
  if (tag) {
    revalidateTag(tag, { expire: 0 });
    revalidated.push(`tag:${tag}`);
  }
  if (path) {
    revalidatePath(path);
    revalidated.push(`path:${path}`);
  }
  if (!tag && !path) {
    revalidateTag("site-config", { expire: 0 });
    revalidatePath("/", "layout");
    revalidated.push("tag:site-config", "path:/ (layout)");
  }

  return NextResponse.json({ ok: true, revalidated, now: Date.now() });
}
