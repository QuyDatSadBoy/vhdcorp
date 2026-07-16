"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { PriceTag } from "@/components/client/price-tag";
import { ArrowRight } from "lucide-react";
import { Reveal, Stagger, StaggerItem, fadeUpItem } from "@/components/animations/reveal";
import { useProducts } from "@/services/product.service";
import type { FeaturedProductsSection as Section } from "@/types/site-config";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageFallback } from "@/components/client/image-fallback";

/**
 * SpotlightCard — Shopify-style card với:
 * - 3D perspective tilt theo cursor
 * - Radial spotlight glow theo vị trí cursor (CSS custom properties)
 * - Shimmer border animation khi hover
 */
function SpotlightCard({ children, href }: { children: React.ReactNode; href: string }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  function onMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = (x / rect.width - 0.5) * 12;
    const ny = (y / rect.height - 0.5) * -12;

    // Spotlight position
    el.style.setProperty("--spotlight-x", `${x}px`);
    el.style.setProperty("--spotlight-y", `${y}px`);
    el.style.setProperty("--spotlight-opacity", "1");

    // 3D tilt
    el.style.transform = `perspective(1000px) rotateX(${ny.toFixed(2)}deg) rotateY(${nx.toFixed(2)}deg) translateY(-6px) scale(1.01)`;
  }

  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--spotlight-opacity", "0");
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";
  }

  return (
    <Link
      ref={cardRef}
      href={href}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="spotlight-card shimmer-border group relative block overflow-hidden rounded-2xl border border-foreground/8 bg-card transition-[box-shadow,border-color,transform] duration-300 will-change-transform hover:border-(--vhd-color-primary)/35 hover:shadow-[0_32px_80px_-24px_color-mix(in_srgb,var(--vhd-color-primary)_50%,transparent)]"
    >
      {children}
    </Link>
  );
}

export default function FeaturedProducts({ section }: { section: Section }) {
  const p = section.props;
  const { data, isLoading } = useProducts({
    pageSize: p.limit ?? 8,
    categoryId: p.categoryId,
    sort: "newest",
  });
  const products = data?.records ?? [];
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 96}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
  }, [p.paddingTop, p.paddingBottom]);

  return (
    <section ref={sectionRef} className="container mx-auto px-4">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="type-eyebrow text-brand-primary">Sản phẩm</p>
          <h2 className="mt-3 type-display-md text-foreground">{p.heading ?? "Sản phẩm nổi bật"}</h2>
          <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
        </div>
        <Link
          href="/products"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline underline-offset-4"
        >
          Xem tất cả sản phẩm
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-3/4 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {products.map((prod) => (
            <StaggerItem key={prod.id} variants={fadeUpItem}>
              <SpotlightCard href={`/products/${prod.slug}`}>
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {prod.images?.[0] ? (
                    <Image
                      src={prod.images[0]}
                      alt={prod.name}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <ImageFallback variant="product" />
                  )}
                  {/* Stock badge */}
                  {prod.stock && prod.stock > 0 ? (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary shadow">
                      Còn hàng
                    </span>
                  ) : null}
                  {/* Hover overlay */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-linear-to-t from-brand-primary/90 via-brand-primary/50 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-primary">
                      Xem chi tiết
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
                <div className="relative z-10 space-y-1.5 p-4">
                  {prod.category?.name ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                      {prod.category.name}
                    </p>
                  ) : null}
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-primary">
                    {prod.name}
                  </h3>
                  {prod.price !== undefined && prod.price !== null && Number(prod.price) > 0 && (
                    <PriceTag product={prod} className="mt-2" />
                  )}
                </div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
