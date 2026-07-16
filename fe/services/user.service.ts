import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { AdminUser, PaginatedResult } from "@/types/domain";

export const userKeys = {
  all: ["users"] as const,
  list: (params?: ListParams) => ["users", "list", params] as const,
};

interface ListParams {
  pageNumber?: number;
  pageSize?: number;
  email?: string;
  orderBy?: string;
  /** true → thùng rác (chỉ user đã xóa, để khôi phục) */
  deletedOnly?: boolean;
  /** Lọc theo vai trò */
  role?: AdminUser["role"];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name?: string;
  role?: AdminUser["role"];
}

export const userService = {
  list: (params?: ListParams) => axios.get<{ data: PaginatedResult<AdminUser> }>("/users", { params }).then(unwrap),
  create: (payload: CreateUserPayload) => axios.post<{ data: AdminUser }>("/users", payload).then(unwrap),
  update: (id: number, payload: { name?: string }) =>
    axios.patch<{ data: AdminUser }>(`/users/${id}`, payload).then(unwrap),
  updateRole: (id: number, role: AdminUser["role"]) =>
    axios.patch<{ data: AdminUser }>(`/users/${id}/role`, { role }).then(unwrap),
  resetPassword: (id: number, newPassword: string) =>
    axios.patch<{ data: { message: string } }>(`/users/${id}/password`, { newPassword }).then(unwrap),
  restore: (id: number) => axios.post<{ data: AdminUser }>(`/users/${id}/restore`).then(unwrap),
  softDelete: (id: number) => axios.delete<{ data: AdminUser }>(`/users/${id}`).then(unwrap),
  sendMail: (payload: { userIds?: number[]; subject: string; html: string }) =>
    axios.post<{ data: { sent: number; failed: number; total: number } }>("/users/send-mail", payload).then(unwrap),
};

export function useAdminUsers(params?: ListParams) {
  return useQuery({ queryKey: userKeys.list(params), queryFn: () => userService.list(params) });
}

function useUserMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useCreateUser() {
  return useUserMutation((payload: CreateUserPayload) => userService.create(payload));
}

export function useUpdateUser() {
  return useUserMutation(({ id, name }: { id: number; name: string }) => userService.update(id, { name }));
}

export function useUpdateUserRole() {
  return useUserMutation(({ id, role }: { id: number; role: AdminUser["role"] }) => userService.updateRole(id, role));
}

export function useResetUserPassword() {
  return useUserMutation(({ id, newPassword }: { id: number; newPassword: string }) =>
    userService.resetPassword(id, newPassword)
  );
}

export function useRestoreUser() {
  return useUserMutation((id: number) => userService.restore(id));
}

export function useSendMailToUsers() {
  return useMutation({
    mutationFn: (payload: { userIds?: number[]; subject: string; html: string }) => userService.sendMail(payload),
  });
}

export function useSoftDeleteUser() {
  return useUserMutation((id: number) => userService.softDelete(id));
}
