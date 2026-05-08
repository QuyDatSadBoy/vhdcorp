"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { Post } from "@/types/domain";
import { PostForm } from "@/components/admin/post-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["posts", "id", id],
    queryFn: () => axios.get<{ data: Post }>(`/posts/${id}`).then(unwrap),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <p>Không tìm thấy.</p>;

  return <div><h1 className="mb-4 text-2xl font-bold">Sửa: {data.title}</h1><PostForm initial={data} /></div>;
}
