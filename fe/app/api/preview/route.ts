import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/**
 * Bật chế độ xem trước bản nháp SiteConfig.
 * Admin builder mở: /api/preview?redirect=/
 * Chỉ bật khi user hiện tại là ADMIN/STAFF (verify qua BE /auth/me bằng cookie forward).
 */
export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get("redirect") ?? "/";
  // Chỉ cho redirect nội bộ
  const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      cache: "no-store",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { role?: string } };
      const role = json.data?.role;
      if (role === "ADMIN" || role === "STAFF") {
        (await draftMode()).enable();
        return NextResponse.redirect(new URL(target, req.url));
      }
    }
  } catch {
    // BE lỗi → không bật preview
  }
  return NextResponse.redirect(new URL(target, req.url));
}
