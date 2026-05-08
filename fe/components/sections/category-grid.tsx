"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Reveal, Stagger, StaggerItem, fadeUpItem } from "@/components/animations/reveal";
import { useCategories } from "@/services/category.service";
import type { CategoryGridSection as Section } from "@/types/site-config";

/** Gradient fallback mỗi danh mục — màu rõ ràng tại TOP (qua overlay), xen kẽ thương hiệu */
const CATEGORY_GRADIENTS = [
  // Sky blue top → Navy bottom
  "linear-gradient(to bottom right, #4FB8E7 0%, #1e4db0 60%, #0f2461 100%)",
  // Amber gold top → Dark warm bottom
  "linear-gradient(to bottom right, #F5A623 0%, #c47e10 55%, #7a4a00 100%)",
  // Teal top → Navy bottom
  "linear-gradient(to bottom right, #22d3ee 0%, #0891b2 55%, #1B3A8C 100%)",
  // Emerald top → Navy bottom
  "linear-gradient(to bottom right, #34d399 0%, #059669 55%, #1B3A8C 100%)",
  // Rose/crimson top → Dark bottom
  "linear-gradient(to bottom right, #fb7185 0%, #e11d48 55%, #7f0d1a 100%)",
  // Violet top → Navy bottom
  "linear-gradient(to bottom right, #a78bfa 0%, #7c3aed 55%, #1B3A8C 100%)",
];

export default function CategoryGrid({ section }: { section: Section }) {
  const p = section.props;
  const sectionRef = useRef<HTMLElement>(null);
  const { data } = useCategories();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 96}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
  }, [p.paddingTop, p.paddingBottom]);

  const all = data ?? [];
  const cats = p.categoryIds && p.categoryIds.length > 0
    ? all.filter((c) => new Set(p.categoryIds).has(c.id))
    : all.filter((c) => !c.parentId);
  if (cats.length === 0) return null;
  const cols = Math.min(p.columns ?? 4, 6);

  return (
    <section
      ref={sectionRef}
      className="container mx-auto px-4"
    >
      <Reveal className="mb-10 max-w-2xl">
        <p className="type-eyebrow text-brand-accent">Danh mục</p>
        <h2 className="mt-3 type-display-md text-foreground">{p.heading ?? "Khám phá theo danh mục"}</h2>
        <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
        <p className="mt-4 text-foreground/65">
          Toàn bộ kho hàng VHD được phân nhóm theo nhu cầu công nghiệp, dân dụng và đặc sản làng nghề — chọn nhóm sản phẩm bạn quan tâm để khám phá nhanh nhất.
        </p>
      </Reveal>

      <Stagger
        className={`grid gap-4 grid-cols-2 md:grid-cols-${Math.min(cols, 4)} lg:grid-cols-${cols}`}
      >
        {cats.map((c, idx) => (
          <StaggerItem key={c.id} variants={fadeUpItem}>
            <Link
              href={`/categories/${c.slug}`}
              className="group relative block aspect-4/5 overflow-hidden rounded-2xl bg-brand-primary"
            >
              {c.image ? (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width:768px) 50vw, 25vw"
                  className="object-cover opacity-85 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length] }}
                />
              )}
              {/* Arrow badge on hover */}
              <span
                aria-hidden
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-brand-primary opacity-0 transition-all duration-300 group-hover:opacity-100"
              >
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="text-lg font-bold text-white drop-shadow">{c.name}</h3>
                {c.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-white/80">{c.description}</p>
                ) : (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">Khám phá ngay →</p>
                )}
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
