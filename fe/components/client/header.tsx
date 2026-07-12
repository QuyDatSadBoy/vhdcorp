"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingBag, User2, Search, Phone } from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/client/theme-toggle";

export default function Header() {
  const config = useSiteConfigStore((s) => s.config);
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = (config?.navigation ?? []).slice().sort((a, b) => a.order - b.order);
  const brand = config?.brand;
  const hotline =
    (config?.footer as { contact?: { hotline?: string; phone?: string } } | undefined)?.contact?.hotline ??
    (config?.footer as { contact?: { hotline?: string; phone?: string } } | undefined)?.contact?.phone;
  // Dòng promo đọc từ SiteConfig — ẩn khi admin tắt showPromo hoặc chưa nhập promoText
  const promoText = config?.header?.showPromo === false ? "" : (config?.header?.promoText ?? "");

  return (
    <>
      {/* Promo strip */}
      <div className="bg-brand-primary text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
          {promoText && (
            <span className="hidden items-center gap-2 md:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-highlight" />
              {promoText}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-3">
            {hotline && (
              <a
                href={`tel:${hotline.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 hover:text-brand-highlight"
              >
                <Phone className="h-3 w-3" /> {hotline}
              </a>
            )}
            <Link href="/contact" className="hover:text-brand-highlight">
              Liên hệ tư vấn
            </Link>
          </span>
        </div>
      </div>

      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        data-scrolled={scrolled ? "true" : "false"}
        className={cn(
          // Luôn hiển thị glass-blur để header không bị "biến mất" trên hero tối.
          // Khi cuộn xuống → opacity dày hơn + shadow rõ hơn.
          "sticky top-0 z-50 w-full transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300",
          "border-b backdrop-blur-md supports-backdrop-filter:backdrop-blur-xl",
          scrolled
            ? "border-foreground/10 bg-background/90 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] supports-backdrop-filter:bg-background/75"
            : "border-white/10 bg-background/55 supports-backdrop-filter:bg-background/35"
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:h-20">
          <Link href="/" className="flex items-center gap-3">
            {brand?.logo?.url && !logoError ? (
              <Image
                src={brand.logo.url}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            ) : (
              <span
                className="grid h-10 w-10 place-items-center rounded-lg bg-linear-to-br from-brand-primary to-brand-accent text-sm font-bold text-white"
                aria-hidden
              >
                VHD
              </span>
            )}
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="font-heading text-base font-bold text-foreground">{brand?.siteName ?? "VHD Corp"}</span>
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-brand-primary/80 dark:text-foreground/65 lg:block">
                {brand?.tagline ?? "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN"}
              </span>
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-0.5 md:flex">
            {nav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                data-cursor-hover
                className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-foreground/85 transition-colors hover:bg-accent/40 hover:text-foreground lg:px-3"
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button variant="ghost" size="icon" asChild aria-label="Tìm kiếm">
              <Link href="/search">
                <Search className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex" aria-label="Sản phẩm">
              <Link href="/products">
                <ShoppingBag className="h-5 w-5" />
              </Link>
            </Button>
            {user ? (
              <Button variant="ghost" size="icon" asChild aria-label="Tài khoản">
                <Link href="/account/profile">
                  <User2 className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="hidden h-9 rounded-full bg-brand-primary px-4 sm:inline-flex">
                <Link href="/login">Đăng nhập</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Mở menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-foreground/10 bg-background md:hidden"
            >
              <nav className="container mx-auto flex flex-col gap-1 p-4">
                {nav.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-accent/40"
                  >
                    {item.label}
                  </Link>
                ))}
                {!user && (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-lg bg-brand-primary px-3 py-3 text-center text-sm font-semibold text-white"
                  >
                    Đăng nhập
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
