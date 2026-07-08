"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageCircle, Phone, X } from "lucide-react";

const SESSION_KEY = "vhd_sticky_cta_dismissed";

interface Props {
  hotline?: string;
  ctaHref?: string;
}

export function StickyCtaBar({ hotline = "+84 28 3000 0000", ctaHref = "/contact" }: Props) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // Hide on contact + admin + auth pages
  const hidePath =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/account") ||
    pathname === "/contact" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname?.startsWith("/callback");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setDismissed(true);
      return;
    }
    const onScroll = () => {
      const passedHero = window.scrollY > window.innerHeight * 0.8;
      // Ẩn khi gần chạm footer để không đè nội dung copyright/contact
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 280;
      setShow(passedHero && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    setDismissed(true);
    setShow(false);
  };

  if (hidePath || dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          suppressHydrationWarning
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-4xl px-4 sm:bottom-6"
        >
          <div className="relative flex flex-col items-stretch gap-3 rounded-2xl border border-foreground/10 bg-background/95 p-3 pr-10 shadow-[0_18px_60px_-20px_rgba(15,35,86,0.35)] backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-3 sm:pr-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-(--vhd-color-highlight)/15 text-brand-highlight">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Cần tư vấn báo giá B2B?</p>
              <p className="text-xs text-foreground/55">Phản hồi trong 24 giờ — VHD luôn sẵn sàng.</p>
            </div>
            <a
              href={`tel:${hotline.replace(/\s/g, "")}`}
              className="hidden items-center gap-1.5 rounded-full border border-foreground/10 px-4 py-2 text-xs font-semibold text-foreground/80 transition-colors hover:border-brand-primary/40 hover:text-foreground sm:inline-flex"
            >
              <Phone className="h-3.5 w-3.5" />
              {hotline}
            </a>
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary/90"
            >
              Liên hệ ngay
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Đóng"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground sm:relative sm:right-0 sm:top-0 sm:h-8 sm:w-8"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
