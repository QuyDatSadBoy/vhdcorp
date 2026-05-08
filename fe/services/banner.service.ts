import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { Banner } from "@/types/domain";

export const bannerKeys = {
  all: ["banners"] as const,
  list: (position?: string) => ["banners", "list", position ?? "all"] as const,
  admin: (position?: string) => ["banners", "admin", position ?? "all"] as const,
};

export const bannerService = {
  list: (position?: string) =>
    axios.get<{ data: Banner[] }>("/banners", { params: { position } }).then(unwrap),
  adminList: (position?: string) =>
    axios.get<{ data: Banner[] }>("/banners/admin", { params: { position } }).then(unwrap),
  create: (payload: Partial<Banner>) => axios.post<{ data: Banner }>("/banners", payload).then(unwrap),
  update: (id: number, payload: Partial<Banner>) =>
    axios.put<{ data: Banner }>(`/banners/${id}`, payload).then(unwrap),
  remove: (id: number) => axios.delete(`/banners/${id}`).then(() => undefined),
};

export function useBanners(position?: string) {
  return useQuery({ queryKey: bannerKeys.list(position), queryFn: () => bannerService.list(position) });
}

export function useAdminBanners(position?: string) {
  return useQuery({ queryKey: bannerKeys.admin(position), queryFn: () => bannerService.adminList(position) });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bannerService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: bannerKeys.all }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Banner> }) =>
      bannerService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bannerKeys.all }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bannerService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: bannerKeys.all }),
  });
}
