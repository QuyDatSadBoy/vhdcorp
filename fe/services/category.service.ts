import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { Category } from "@/types/domain";

export const categoryKeys = {
  all: ["categories"] as const,
  list: (params?: ListParams) => ["categories", "list", params] as const,
  tree: ["categories", "tree"] as const,
  bySlug: (slug: string) => ["categories", "slug", slug] as const,
  byId: (id: number) => ["categories", "id", id] as const,
};

interface ListParams {
  search?: string;
  parentId?: number | null;
  includeChildren?: boolean;
}

export const categoryService = {
  list: (params?: ListParams) =>
    axios
      .get<{ data: Category[] }>("/categories", {
        params: {
          ...params,
          parentId: params?.parentId === null ? "null" : (params?.parentId ?? undefined),
          includeChildren: params?.includeChildren ? "true" : undefined,
        },
      })
      .then(unwrap),
  tree: () => axios.get<{ data: Category[] }>("/categories/tree").then(unwrap),
  bySlug: (slug: string) => axios.get<{ data: Category }>(`/categories/slug/${slug}`).then(unwrap),
  byId: (id: number) => axios.get<{ data: Category }>(`/categories/${id}`).then(unwrap),
  create: (payload: Partial<Category>) => axios.post<{ data: Category }>("/categories", payload).then(unwrap),
  update: (id: number, payload: Partial<Category>) =>
    axios.put<{ data: Category }>(`/categories/${id}`, payload).then(unwrap),
  remove: (id: number) => axios.delete(`/categories/${id}`).then(() => undefined),
};

export function useCategories(params?: ListParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoryService.list(params),
    staleTime: 5 * 60_000,
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.tree,
    queryFn: categoryService.tree,
    staleTime: 5 * 60_000,
  });
}

export function useCategoryBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: slug ? categoryKeys.bySlug(slug) : ["categories", "slug", "none"],
    queryFn: () => categoryService.bySlug(slug as string),
    enabled: Boolean(slug),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Category> }) => categoryService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
