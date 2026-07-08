"use client";

import { use } from "react";
import { useProductById } from "@/services/product.service";
import { ProductForm } from "@/components/admin/product-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useProductById(Number(id));

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <p>Không tìm thấy sản phẩm.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chỉnh sửa: {data.name}</h1>
      <ProductForm initial={data} />
    </div>
  );
}
