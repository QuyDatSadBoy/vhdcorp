import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { buildMetadata } from "@/lib/seo";
import { serverApi } from "@/lib/server-api";
import { SITE_URL } from "@/components/seo/json-ld";
import { PageHero } from "@/components/client/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { ImageFallback } from "@/components/client/image-fallback";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Danh mục sản phẩm",
    description:
      "Tất cả danh mục sản phẩm VHD Corp — vật tư điện lạnh, cơ điện, gioăng cao su, khuôn mẫu, đúc nhựa và nhiều hơn nữa.",
    canonical: `${SITE_URL}/categories`,
  });
}

export default async function CategoriesIndexPage() {
  const categories = (await serverApi.categories()) ?? [];

  // Chỉ hiển thị danh mục gốc (parentId === null) — children render lồng bên trong.
  const roots = categories.filter((c) => c.parentId === null);

  return (
    <>
      <PageHero
        eyebrow="Toàn bộ danh mục"
        title="Danh mục sản phẩm"
        description="Khám phá toàn bộ danh mục sản phẩm và dịch vụ VHD Corp."
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Danh mục" }]}
      />
      <div className="container mx-auto px-4 py-12">
        {roots.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-12 text-center text-foreground/60">
            Hiện chưa có danh mục nào.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {roots.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`}>
                <Card className="group h-full overflow-hidden border-foreground/8 transition-all hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-md">
                  <div className="relative aspect-square bg-muted">
                    {c.image ? (
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        sizes="(max-width:768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <ImageFallback />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-1">
                    <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-brand-primary">
                      {c.name}
                    </h3>
                    {c.children && c.children.length > 0 && (
                      <p className="text-xs text-foreground/55">{c.children.length} danh mục con</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
