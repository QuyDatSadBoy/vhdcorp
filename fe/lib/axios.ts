import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/types/api";

/**
 * Axios instance — JWT qua HttpOnly cookie (BE set), KHÔNG đọc/ghi localStorage.
 * - `withCredentials: true` để cookie tự gửi.
 * - Response 401 → tự gọi POST /auth/refresh, retry 1 lần.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Phiên admin và phiên khách tách cookie riêng — BE chọn bộ cookie theo header này.
    // Nhờ đó mở 2 tab (1 admin, 1 khách) cùng trình duyệt không đè phiên nhau.
    if (typeof window !== "undefined") {
      config.headers.set("X-Session-Scope", window.location.pathname.startsWith("/admin") ? "admin" : "client");
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

let refreshing: Promise<void> | null = null;

async function performRefresh(): Promise<void> {
  if (!refreshing) {
    refreshing = axiosInstance
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
      // /auth/me: CHO auto-refresh — khi access hết hạn (15m) thì refresh ngầm,
      // không đá user ra login. (me() chỉ gọi khi đã đăng nhập nhờ sessionHint.)
    ) {
      originalRequest._retry = true;
      try {
        await performRefresh();
        return axiosInstance(originalRequest);
      } catch {
        // Chỉ redirect về login nếu đang ở trang yêu cầu xác thực (account/*)
        const PROTECTED_PREFIXES = ["/account", "/admin"];
        const isProtectedPath =
          typeof window !== "undefined" &&
          PROTECTED_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));
        if (isProtectedPath) {
          const path = window.location.pathname;
          const loginUrl = path.startsWith("/admin") ? "/admin/login" : "/login";
          window.location.href = `${loginUrl}?next=${encodeURIComponent(path)}`;
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

/** Mọi toast trong app dùng e.message — chuẩn hóa về tiếng Việt tại một chỗ duy nhất.
 *  Ưu tiên message BE (đã tiếng Việt); thiếu thì dịch theo status code. */
const VI_BY_STATUS: Record<number, string> = {
  400: "Yêu cầu không hợp lệ",
  401: "Bạn cần đăng nhập để tiếp tục",
  403: "Bạn không có quyền thực hiện thao tác này",
  404: "Không tìm thấy dữ liệu yêu cầu",
  409: "Dữ liệu bị trùng, vui lòng kiểm tra lại",
  413: "Tệp quá lớn, vui lòng chọn tệp nhỏ hơn",
  429: "Thao tác quá nhanh, vui lòng thử lại sau ít phút",
  500: "Hệ thống đang gặp sự cố, vui lòng thử lại",
  503: "Hệ thống đang bảo trì, vui lòng quay lại sau",
};

function normalizeError(error: AxiosError<ApiError>): AxiosError<ApiError> {
  const beMessage = (error.response?.data as { message?: string | string[] } | undefined)?.message;
  const vi = Array.isArray(beMessage) ? beMessage.join("\n") : beMessage;
  const status = error.response?.status;
  error.message =
    vi ||
    (status ? VI_BY_STATUS[status] : undefined) ||
    (error.code === "ERR_NETWORK"
      ? "Không kết nối được máy chủ — kiểm tra mạng và thử lại"
      : "Có lỗi xảy ra, vui lòng thử lại");
  return error;
}

export default axiosInstance;
