import { ProductForm } from "@/components/admin/product-form";

export default function AdminNewProductPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tạo sản phẩm mới</h1>
      <ProductForm />
    </div>
  );
}
