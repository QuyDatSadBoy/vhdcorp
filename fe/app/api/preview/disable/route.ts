import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";

/** Thoát chế độ xem trước bản nháp. */
export async function GET(req: NextRequest) {
  (await draftMode()).disable();
  const redirect = req.nextUrl.searchParams.get("redirect") ?? "/";
  const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  return NextResponse.redirect(new URL(target, req.url));
}
