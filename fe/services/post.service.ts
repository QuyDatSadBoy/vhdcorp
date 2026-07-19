import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { PaginatedResult, Post } from "@/types/domain";

export interface PostListParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
  status?: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  /** Chỉ lấy bài viết nổi bật (admin bật). */
  featured?: boolean;
}

export const postKeys = {
  all: ["posts"] as const,
  list: (p?: PostListParams) => ["posts", "list", p] as const,
  adminList: (p?: PostListParams) => ["posts", "admin", p] as const,
  bySlug: (slug: string) => ["posts", "slug", slug] as const,
  byId: (id: number) => ["posts", "id", id] as const,
};

export const postService = {
  list: (params?: PostListParams) => axios.get<{ data: PaginatedResult<Post> }>("/posts", { params }).then(unwrap),
  adminList: (params?: PostListParams) =>
    axios.get<{ data: PaginatedResult<Post> }>("/posts/admin", { params }).then(unwrap),
  bySlug: (slug: string) => axios.get<{ data: Post }>(`/posts/slug/${slug}`).then(unwrap),
  byId: (id: number) => axios.get<{ data: Post }>(`/posts/${id}`).then(unwrap),
  create: (payload: Partial<Post>) => axios.post<{ data: Post }>("/posts", payload).then(unwrap),
  update: (id: number, payload: Partial<Post>) => axios.put<{ data: Post }>(`/posts/${id}`, payload).then(unwrap),
  remove: (id: number) => axios.delete(`/posts/${id}`).then(() => undefined),
};

export function usePosts(params?: PostListParams) {
  return useQuery({
    queryKey: postKeys.list(params),
    queryFn: () => postService.list(params),
    staleTime: 60_000,
  });
}

export function useAdminPosts(params?: PostListParams) {
  return useQuery({ queryKey: postKeys.adminList(params), queryFn: () => postService.adminList(params) });
}

export function usePostBySlug(slug?: string) {
  return useQuery({
    queryKey: slug ? postKeys.bySlug(slug) : ["posts", "slug", "none"],
    queryFn: () => postService.bySlug(slug as string),
    enabled: Boolean(slug),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Post> }) => postService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  });
}
