"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteConfigStore } from "@/store/site-config.store";

export interface TocItem {
  id: string;
  label: string;
}

interface Props {
  items: TocItem[];
  ctaHref?: string;
  ctaLabel?: string;
}

export function SectionToc({ items, ctaHref = "/contact", ctaLabel = "Liên hệ" }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const config = useSiteConfigStore((s) => s.config);
  const brand = config?.brand;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;
        const top = visibleEntries.reduce((a, b) => (a.intersectionRatio > b.intersectionRatio ? a : b));
        setActive(top.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      aria-hidden={visible ? "false" : "true"}
      className={cn(
        "sticky top-16 z-40 border-b border-foreground/8 bg-background/95 shadow-[0_2px_8px_-4px_rgba(15,35,86,0.1)] backdrop-blur transition-all duration-300 md:top-20",
        visible ? "translate-y-0 opacity-100" : "-translate-y-full pointer-events-none opacity-0"
      )}
    >
      <div className="container mx-auto flex h-12 items-center gap-3 px-4 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {brand?.logo?.url ? (
            <Image
              src={brand.logo.url}
              alt={brand.siteName ?? "VHD"}
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
            />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded bg-brand-primary text-[10px] font-bold text-white">
              V
            </span>
          )}
          <span className="text-sm font-bold tracking-tight text-foreground">VHD</span>
        </Link>

        <span aria-hidden className="h-4 w-px shrink-0 bg-foreground/15" />

        <nav className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active === it.id
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <Link
          href={ctaHref}
          className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-primary/90 sm:inline-flex"
        >
          {ctaLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
