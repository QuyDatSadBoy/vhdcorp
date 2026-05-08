import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/types/api";

/**
 * Axios instance — JWT qua HttpOnly cookie (BE set), KHÔNG đọc/ghi localStorage.
 * - `withCredentials: true` để cookie tự gửi.
 * - Response 401 → tự gọi POST /auth/refresh, retry 1 lần.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error: AxiosError) => Promise.reject(error),
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
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      // Anonymous /auth/me là trạng thái hợp lệ — không cần auto-refresh.
      !originalRequest.url?.endsWith("/auth/me")
    ) {
      originalRequest._retry = true;
      try {
        await performRefresh();
        return axiosInstance(originalRequest);
      } catch {
        // Chỉ redirect về login nếu đang ở trang yêu cầu xác thực (account/*)
        const PROTECTED_PREFIXES = ["/account"];
        const isProtectedPath =
          typeof window !== "undefined" &&
          PROTECTED_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));
        if (isProtectedPath) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
