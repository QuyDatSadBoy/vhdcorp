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
}

export const userService = {
  list: (params?: ListParams) => axios.get<{ data: PaginatedResult<AdminUser> }>("/users", { params }).then(unwrap),
  updateRole: (id: number, role: AdminUser["role"]) =>
    axios.patch<{ data: AdminUser }>(`/users/${id}/role`, { role }).then(unwrap),
  softDelete: (id: number) => axios.delete<{ data: AdminUser }>(`/users/${id}`).then(unwrap),
};

export function useAdminUsers(params?: ListParams) {
  return useQuery({ queryKey: userKeys.list(params), queryFn: () => userService.list(params) });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: AdminUser["role"] }) => userService.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useSoftDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
