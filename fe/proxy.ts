import { NextRequest, NextResponse } from "next/server";

const CLIENT_AUTH_ROUTES = ["/login", "/register"];
const ADMIN_LOGIN = "/admin/login";
const ADMIN_PREFIX = "/admin";
const ACCOUNT_PREFIX = "/account";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Phiên admin và phiên khách dùng bộ cookie RIÊNG (mở 2 tab không đè nhau):
  // /admin* đọc admin_access_token, còn lại đọc access_token.
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  // Gác cổng theo "CÓ phiên hay không" = có access HOẶC refresh token.
  // Access token hết hạn (15m/1h) → trình duyệt tự xóa cookie, NHƯNG refresh (7 ngày) còn.
  // Nếu chỉ kiểm access → hết hạn là đá ra login dù refresh còn → client auto-refresh vô dụng.
  // Cho qua khi còn refresh → trang tải → interceptor client tự refresh ngầm (ở lại, không văng).
  const access = request.cookies.get(isAdminRoute ? "admin_access_token" : "access_token")?.value;
  const refresh = request.cookies.get(isAdminRoute ? "admin_refresh_token" : "refresh_token")?.value;
  const token = access || refresh;

  const isAdminLogin = pathname === ADMIN_LOGIN;
  const isAccountRoute = pathname.startsWith(ACCOUNT_PREFIX);
  const isClientAuthRoute = CLIENT_AUTH_ROUTES.some((route) => pathname === route);

  if (isAdminRoute && !isAdminLogin && !token) {
    const loginUrl = new URL(ADMIN_LOGIN, request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (isAccountRoute && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Không tự động redirect /admin/login khi có token —
  // admin layout sẽ tự fetch /api/auth/me để kiểm tra role và redirect nếu đã đăng nhập đúng role
  // if (isAdminLogin && token) {
  //   return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  // }

  if (isClientAuthRoute && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
