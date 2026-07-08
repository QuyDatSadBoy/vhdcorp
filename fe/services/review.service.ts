import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { PaginatedResult, Review } from "@/types/domain";

export const reviewKeys = {
  forProduct: (slug: string) => ["reviews", "product", slug] as const,
  admin: (params?: Record<string, unknown>) => ["reviews", "admin", params] as const,
};

export const reviewService = {
  forProduct: (slug: string) => axios.get<{ data: Review[] }>(`/reviews/product/${slug}`).then(unwrap),
  adminList: (params?: { pageNumber?: number; pageSize?: number; status?: string }) =>
    axios.get<{ data: PaginatedResult<Review> }>("/reviews/admin", { params }).then(unwrap),
  create: (payload: { productId: number; rating: number; content: string }) =>
    axios.post<{ data: Review }>("/reviews", payload).then(unwrap),
  setStatus: (id: number, status: "PENDING" | "APPROVED" | "REJECTED") =>
    axios.patch<{ data: Review }>(`/reviews/${id}/status`, { status }).then(unwrap),
  remove: (id: number) => axios.delete(`/reviews/${id}`).then(() => undefined),
};

export function useProductReviews(slug?: string) {
  return useQuery({
    queryKey: slug ? reviewKeys.forProduct(slug) : ["reviews", "none"],
    queryFn: () => reviewService.forProduct(slug as string),
    enabled: Boolean(slug),
  });
}

export function useAdminReviews(params?: { status?: string; pageNumber?: number; pageSize?: number }) {
  return useQuery({ queryKey: reviewKeys.admin(params), queryFn: () => reviewService.adminList(params) });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useSetReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "PENDING" | "APPROVED" | "REJECTED" }) =>
      reviewService.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}
