"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Package, Search } from "lucide-react";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatVnd, saleActive } from "@/lib/price";

interface Suggestion {
  id: number;
  slug: string;
  name: string;
  price: string | number;
  salePrice: string | number | null;
  saleEndsAt?: string | null;
  image: string;
  category: string;
}

/**
 * Ô tìm kiếm gợi ý thông minh (kiểu Shopee): gõ là hiện dropdown sản phẩm khớp
 * (không dấu cũng khớp — BE unaccent), bấm chọn mở thẳng trang sản phẩm,
 * Enter mở trang tìm kiếm đầy đủ.
 */
export function SmartSearch({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounce 250ms — hủy kết quả cũ khi gõ tiếp
  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await axios
          .get<{ data: Suggestion[] }>("/products/suggest", { params: { q: q.trim() } })
          .then(unwrap);
        if (!cancelled) {
          setItems(data);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  // Click ra ngoài → đóng dropdown
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder="Tìm sản phẩm…"
          autoFocus={autoFocus}
          className="h-9 w-full rounded-full border bg-background/80 pl-9 pr-8 text-sm text-ellipsis outline-none transition placeholder:text-muted-foreground/70 focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border bg-popover shadow-xl">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/products/${s.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-0 hover:bg-accent/50"
            >
              {s.image ? (
                <Image
                  src={s.image}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-primary/10">
                  <Package className="h-4 w-4 text-brand-primary" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">{s.category}</span>
              </span>
              <span className="shrink-0 text-sm font-bold">
                {saleActive(s) ? (
                  <>
                    <span className="text-brand-danger">{formatVnd(s.salePrice)}</span>
                    <span className="ml-1 text-[10px] font-medium text-foreground/40 line-through">
                      {formatVnd(s.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-brand-primary">{formatVnd(s.price)}</span>
                )}
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="w-full bg-muted/40 px-3 py-2 text-center text-xs font-semibold text-brand-primary hover:bg-muted"
          >
            Xem tất cả kết quả cho “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
