import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response Interceptor ──────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401: token expired → try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axiosInstance.post<{ access_token: string }>("/auth/refresh", {
          refresh_token: refreshToken,
        });

        localStorage.setItem("access_token", data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return axiosInstance(originalRequest);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
