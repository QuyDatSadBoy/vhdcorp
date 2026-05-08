import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  variant?: "light" | "dark";
}

/**
 * Page hero — dùng cho mọi trang nội dung (list/detail/info) để giữ nhất quán visual hierarchy:
 * eyebrow brand-accent → display heading brand-primary (hoặc white nếu dark) → underline yellow → description.
 */
export function PageHero({ eyebrow, title, description, breadcrumbs, variant = "light" }: PageHeroProps) {
  const isDark = variant === "dark";
  return (
    <section
      className={
        "relative isolate overflow-hidden " +
        (isDark
          ? "bg-(--vhd-color-primary) text-white"
          : "border-b border-foreground/8 bg-(--vhd-color-surface)/60")
      }
    >
      {isDark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(60%_55%_at_85%_30%,color-mix(in_srgb,var(--vhd-color-accent)_40%,transparent)_0%,transparent_70%),radial-gradient(45%_45%_at_15%_80%,color-mix(in_srgb,var(--vhd-color-highlight)_30%,transparent)_0%,transparent_70%)]"
        />
      )}
      <div className="container relative mx-auto max-w-5xl px-4 py-14 md:py-20">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className={
              "mb-5 flex flex-wrap items-center gap-1.5 text-sm " +
              (isDark ? "text-white/70" : "text-foreground/55")
            }
          >
            {breadcrumbs.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {b.href ? (
                  <Link
                    href={b.href}
                    className={isDark ? "hover:text-white" : "hover:text-foreground"}
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className={isDark ? "text-white" : "text-foreground"}>{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p
            className={
              "type-eyebrow " + (isDark ? "text-brand-highlight" : "text-brand-accent")
            }
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={
            "mt-3 type-display-lg " + (isDark ? "text-white" : "text-foreground")
          }
        >
          {title}
        </h1>
        <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
        {description && (
          <p
            className={
              "mt-5 max-w-3xl type-lead " + (isDark ? "text-white/80" : "text-foreground/65")
            }
          >
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
