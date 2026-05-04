import { NextRequest, NextResponse } from "next/server";

const CLIENT_AUTH_ROUTES = ["/login", "/register"];
const ADMIN_LOGIN = "/admin/login";
const ADMIN_PREFIX = "/admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isAdminLogin = pathname === ADMIN_LOGIN;
  const isClientAuthRoute = CLIENT_AUTH_ROUTES.some((route) => pathname === route);

  // Chưa login mà vào admin (trừ /admin/login) → redirect /admin/login
  if (isAdminRoute && !isAdminLogin && !token) {
    const loginUrl = new URL(ADMIN_LOGIN, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Đã login mà vào /admin/login → redirect dashboard
  if (isAdminLogin && token) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Đã login mà vào /login hoặc /register → redirect trang chủ
  if (isClientAuthRoute && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
