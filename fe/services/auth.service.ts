import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

const authApi = {
  // Anonymous user trả về null thay vì throw — tránh nhiễu log 401 trên trang public.
  me: async (): Promise<AuthUser | null> => {
    try {
      return await axios.get<{ data: AuthUser }>("/auth/me").then(unwrap);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) return null;
      throw err;
    }
  },
  login: (payload: LoginPayload) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/login", payload).then(unwrap),
  adminLogin: (payload: LoginPayload) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/admin/login", payload).then(unwrap),
  register: (payload: RegisterPayload) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/register", payload).then(unwrap),
  google: (idToken: string) =>
    axios.post<{ data: { user: AuthUser } }>("/auth/google", { idToken }).then(unwrap),
  logout: () => axios.post("/auth/logout").then(() => undefined),
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
    onSuccess: (result) => qc.setQueryData(authKeys.me, result.user),
  });
}

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.adminLogin,
    onSuccess: (result) => qc.setQueryData(authKeys.me, result.user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (result) => qc.setQueryData(authKeys.me, result.user),
  });
}

export function useGoogleSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.google,
    onSuccess: (result) => qc.setQueryData(authKeys.me, result.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.setQueryData(authKeys.me, null);
      qc.clear();
    },
  });
}

export const auth = authApi;
