import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { PaginatedResult, Product } from "@/types/domain";

export interface ProductListParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  categorySlug?: string;
  categoryId?: number;
  status?: "DRAFT" | "PUBLISHED";
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  /** Chỉ lấy sản phẩm nổi bật (admin bật). */
  featured?: boolean;
  /** Chỉ lấy sản phẩm bán chạy (admin bật). */
  bestSeller?: boolean;
}

export const productKeys = {
  all: ["products"] as const,
  list: (params?: ProductListParams) => ["products", "list", params] as const,
  adminList: (params?: ProductListParams) => ["products", "admin", params] as const,
  bySlug: (slug: string) => ["products", "slug", slug] as const,
  byId: (id: number) => ["products", "id", id] as const,
  related: (id: number) => ["products", "related", id] as const,
};

export const productService = {
  list: (params?: ProductListParams) =>
    axios.get<{ data: PaginatedResult<Product> }>("/products", { params }).then(unwrap),
  adminList: (params?: ProductListParams) =>
    axios.get<{ data: PaginatedResult<Product> }>("/products/admin", { params }).then(unwrap),
  bySlug: (slug: string) => axios.get<{ data: Product }>(`/products/slug/${slug}`).then(unwrap),
  byId: (id: number) => axios.get<{ data: Product }>(`/products/${id}`).then(unwrap),
  // "Khách xem X cũng xem Y" (tracking thật) — BE tự fallback sản phẩm cùng danh mục khi thiếu dữ liệu
  related: (id: number) => axios.get<{ data: Product[] }>(`/products/${id}/recommendations`).then(unwrap),
  create: (payload: Partial<Product>) => axios.post<{ data: Product }>("/products", payload).then(unwrap),
  update: (id: number, payload: Partial<Product>) =>
    axios.put<{ data: Product }>(`/products/${id}`, payload).then(unwrap),
  remove: (id: number) => axios.delete(`/products/${id}`).then(() => undefined),
  restore: (id: number) => axios.post(`/products/${id}/restore`).then(() => undefined),
};

export function useProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.list(params),
    staleTime: 60_000,
  });
}

export function useAdminProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: productKeys.adminList(params),
    queryFn: () => productService.adminList(params),
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: slug ? productKeys.bySlug(slug) : ["products", "slug", "none"],
    queryFn: () => productService.bySlug(slug as string),
    enabled: Boolean(slug),
  });
}

export function useProductById(id: number | undefined) {
  return useQuery({
    queryKey: id ? productKeys.byId(id) : ["products", "id", 0],
    queryFn: () => productService.byId(id as number),
    enabled: Boolean(id),
  });
}

export function useRelatedProducts(id: number | undefined) {
  return useQuery({
    queryKey: id ? productKeys.related(id) : ["products", "related", 0],
    queryFn: () => productService.related(id as number),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Product> }) => productService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
