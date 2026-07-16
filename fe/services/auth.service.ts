import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

/**
 * Session hint — cookie auth là HttpOnly nên client không đọc được.
 * Đánh dấu localStorage sau khi login để khách vãng lai KHÔNG bắn /auth/me
 * (tránh 401 network error trong console trên mọi trang public).
 */
const SESSION_HINT_KEY = "vhd_session";
const hasSessionHint = () => typeof window !== "undefined" && localStorage.getItem(SESSION_HINT_KEY) === "1";
export const setSessionHint = (on: boolean) => {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(SESSION_HINT_KEY, "1");
  else localStorage.removeItem(SESSION_HINT_KEY);
};

export const authApi = {
  // Anonymous user trả về null thay vì throw — tránh nhiễu log 401 trên trang public.
  me: async (): Promise<AuthUser | null> => {
    if (!hasSessionHint()) return null;
    try {
      return await axios.get<{ data: AuthUser }>("/auth/me").then(unwrap);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setSessionHint(false);
        return null;
      }
      throw err;
    }
  },
  login: (payload: LoginPayload) => axios.post<{ data: { user: AuthUser } }>("/auth/login", payload).then(unwrap),
  adminLogin: (payload: LoginPayload) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/admin/login", payload).then(unwrap),
  register: (payload: RegisterPayload) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/register", payload).then(unwrap),
  google: (idToken: string) => axios.post<{ data: { user: AuthUser } }>("/auth/google", { idToken }).then(unwrap),
  logout: () => axios.post("/auth/logout").then(() => undefined),
  verifyEmail: (payload: { email: string; code: string }) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/verify-email", payload).then(unwrap),
  resendVerification: (email: string) =>
    axios.post<{ data: { message: string } }>("/auth/resend-verification", { email }).then(unwrap),
  forgotPassword: (email: string) =>
    axios.post<{ data: { message: string } }>("/auth/forgot-password", { email }).then(unwrap),
  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    axios.post<{ data: { message: string } }>("/auth/reset-password", payload).then(unwrap),
};

export function useMe(enabled = true) {
  return useQuery<AuthUser | null>({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setSessionHint(true);
      qc.setQueryData(authKeys.me, result.user);
    },
  });
}

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.adminLogin,
    onSuccess: (result) => {
      setSessionHint(true);
      qc.setQueryData(authKeys.me, result.user);
    },
  });
}

export function useRegister() {
  // Đăng ký KHÔNG auto-login — user phải xác minh email bằng mã OTP trước
  return useMutation({ mutationFn: authApi.register });
}

export function useVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyEmail,
    // Verify thành công = BE set cookie đăng nhập luôn
    onSuccess: (result) => {
      setSessionHint(true);
      qc.setQueryData(authKeys.me, result.user);
    },
  });
}

export function useGoogleSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.google,
    onSuccess: (result) => {
      setSessionHint(true);
      qc.setQueryData(authKeys.me, result.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setSessionHint(false);
      qc.setQueryData(authKeys.me, null);
      qc.clear();
    },
  });
}

export const auth = authApi;
