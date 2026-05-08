import type { AxiosResponse } from "axios";

/**
 * BE TransformInterceptor bọc mọi response thành { statusCode, success, data, message }.
 * Service có thể type response là `{ data: T }` cho gọn — helper này lấy `data` ra.
 */
export interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  data: T;
  message?: string;
}

export function unwrap<T>(res: AxiosResponse<{ data: T }>): T {
  return res.data.data;
}
