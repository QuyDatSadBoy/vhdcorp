"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  BadgePercent,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/client/page-hero";
import { formatVnd } from "@/lib/price";
import { orderService, useCreateOrder } from "@/services/order.service";
import { useAuthStore } from "@/store/auth.store";
import { selectCartSubtotal, useCartStore } from "@/store/cart.store";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/product.service";
import { PriceTag } from "@/components/client/price-tag";
import type { Order } from "@/types/domain";

/** Giỏ hàng + đặt hàng kiểu Shopee — KHÔNG thanh toán online, admin nhận mail và liên hệ chốt đơn. */
export default function CartPageClient() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore(selectCartSubtotal);
  const user = useAuthStore((s) => s.user);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  const createOrder = useCreateOrder();

  // Đăng nhập rồi → tự điền toàn bộ từ hồ sơ (tên/email/SĐT/địa chỉ) — đặt đơn vài giây
  if (user && !prefilled) {
    setName((v) => v || user.name || "");
    setEmail((v) => v || user.email || "");
    setPhone((v) => v || user.phone || "");
    setAddress((v) => v || user.address || "");
    setPrefilled(true);
  }

  const discount = voucher?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      setCheckingVoucher(true);
      const res = await orderService.validateVoucher(voucherCode.trim(), subtotal);
      setVoucher({ code: res.code, discount: res.discount });
      toast.success(`Áp dụng ${res.code}: giảm ${formatVnd(res.discount)}`);
    } catch (e) {
      setVoucher(null);
      toast.error(e instanceof Error ? e.message : "Mã voucher không hợp lệ");
    } finally {
      setCheckingVoucher(false);
    }
  };

  const placeOrder = async () => {
    try {
      const order = await createOrder.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        voucherCode: voucher?.code,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      });
      setPlaced(order);
      clear();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đặt hàng thất bại, vui lòng thử lại");
    }
  };

  /* ── Màn đặt hàng thành công ── */
  if (placed) {
    return (
      <>
        <PageHero
          variant="dark"
          eyebrow="Đặt hàng thành công"
          title="VHD Corp đã nhận đơn của bạn!"
          description={`Mã đơn hàng: ${placed.code}. Chúng tôi đã gửi email xác nhận và sẽ gọi điện chốt đơn trong 24 giờ — bạn KHÔNG cần thanh toán online.`}
          breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Giỏ hàng" }]}
        />
        <div className="container mx-auto max-w-2xl px-4 py-14 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <p className="text-lg font-semibold">
            Tổng đơn: <span className="text-brand-primary">{formatVnd(placed.total)}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Kiểm tra hộp thư <b>{placed.email}</b> để xem chi tiết đơn {placed.code}.
          </p>
          {!user && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-5">
              <p className="flex items-center justify-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-brand-highlight" /> Tạo tài khoản để theo dõi đơn hàng
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Đăng ký bằng email <b>{placed.email}</b> để xem lịch sử và trạng thái đơn ngay trên web.
              </p>
              <Button asChild className="mt-4 rounded-full">
                <Link href="/register">Đăng ký miễn phí</Link>
              </Button>
            </div>
          )}
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/products">Tiếp tục mua sắm</Link>
            </Button>
            {user && (
              <Button asChild className="rounded-full">
                <Link href="/account/orders">Xem đơn hàng của tôi</Link>
              </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ── Giỏ trống ── */
  if (items.length === 0) {
    return (
      <>
        <PageHero
          variant="dark"
          eyebrow="Giỏ hàng"
          title="Giỏ hàng của bạn"
          description="Chưa có sản phẩm nào trong giỏ — khám phá sản phẩm và bấm 'Thêm vào giỏ' nhé."
          breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Giỏ hàng" }]}
        />
        <div className="container mx-auto max-w-xl px-4 py-16 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-brand-primary/10">
            <ShoppingCart className="h-8 w-8 text-brand-primary" />
          </div>
          <p className="text-muted-foreground">Giỏ hàng đang trống.</p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/products">
              <Package className="mr-2 h-4 w-4" /> Xem sản phẩm
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Giỏ hàng"
        title="Giỏ hàng của bạn"
        description="Đặt hàng không cần thanh toán online — VHD Corp sẽ liên hệ xác nhận và giao hàng."
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Giỏ hàng" }]}
      />
      <div className="container mx-auto px-4 py-12">
        {/* Khuyến khích đăng nhập — tự điền thông tin + theo dõi đơn */}
        {!user && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 px-5 py-3.5">
            <p className="flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 text-brand-primary" />
              <span>
                <b>Đặt hàng cần đăng nhập</b> (thêm giỏ thì không) — để theo dõi đơn và tự điền thông tin từ hồ sơ. Chưa
                có tài khoản? Đăng ký 1 phút.
              </span>
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href="/login?next=/cart">Đăng nhập</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/register">Đăng ký</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* ── Danh sách sản phẩm ── */}
          <div className="space-y-3">
            {items.map((i) => (
              <Card key={i.productId}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Link href={`/products/${i.slug}`} className="shrink-0">
                    {i.image ? (
                      <Image
                        src={i.image}
                        alt=""
                        width={72}
                        height={72}
                        className="h-18 w-18 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="grid h-18 w-18 place-items-center rounded-xl bg-brand-primary/10">
                        <Package className="h-7 w-7 text-brand-primary" />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${i.slug}`} className="line-clamp-1 font-semibold hover:text-brand-primary">
                      {i.name}
                    </Link>
                    <p className="mt-1 text-sm">
                      <span className={i.salePrice ? "font-bold text-brand-danger" : "font-bold text-brand-primary"}>
                        {formatVnd(i.salePrice ?? i.price)}
                      </span>
                      {i.salePrice != null && (
                        <span className="ml-2 text-xs text-foreground/45 line-through">{formatVnd(i.price)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center rounded-full border">
                    <button
                      type="button"
                      aria-label="Giảm"
                      className="grid h-8 w-8 place-items-center rounded-l-full hover:bg-accent"
                      onClick={() => setQty(i.productId, i.qty - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold">{i.qty}</span>
                    <button
                      type="button"
                      aria-label="Tăng"
                      className="grid h-8 w-8 place-items-center rounded-r-full hover:bg-accent disabled:opacity-40"
                      disabled={i.stock > 0 && i.qty >= i.stock}
                      onClick={() => setQty(i.productId, i.qty + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="w-24 text-right font-bold">{formatVnd((i.salePrice ?? i.price) * i.qty)}</p>
                  <button
                    type="button"
                    aria-label={`Xóa ${i.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-500/10"
                    onClick={() => remove(i.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Voucher + thông tin nhận hàng + tổng ── */}
          <div className="space-y-5">
            <Card>
              <CardContent className="space-y-3 p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <BadgePercent className="h-4 w-4 text-brand-highlight" /> Mã giảm giá
                </p>
                <div className="flex gap-2">
                  <Input
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="VD: GIAM10"
                    className="uppercase"
                  />
                  <Button variant="outline" onClick={() => void applyVoucher()} disabled={checkingVoucher}>
                    {checkingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp dụng"}
                  </Button>
                </div>
                {voucher && (
                  <p className="text-sm text-emerald-600">
                    ✓ {voucher.code} — giảm {formatVnd(voucher.discount)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3.5 p-5">
                <p className="font-semibold">Thông tin nhận hàng</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="cart-name">Họ tên *</Label>
                    <Input
                      id="cart-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cart-phone">Số điện thoại *</Label>
                    <Input
                      id="cart-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="VD: 0901 234 567"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cart-email">Email *</Label>
                  <Input
                    id="cart-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cart-address">Địa chỉ nhận hàng *</Label>
                  <Input
                    id="cart-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: 12 Nguyễn Huệ, Quận 1, TP.HCM"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cart-note">Ghi chú (không bắt buộc)</Label>
                  <textarea
                    id="cart-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: giao giờ hành chính, gọi trước khi giao…"
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-semibold">{formatVnd(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Giảm giá ({voucher?.code})</span>
                    <span className="font-semibold text-brand-danger">-{formatVnd(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-bold">Tổng cộng</span>
                  <span className="font-extrabold text-brand-primary">{formatVnd(total)}</span>
                </div>
                {user ? (
                  <Button
                    className="mt-2 w-full rounded-full"
                    size="lg"
                    onClick={() => void placeOrder()}
                    disabled={
                      createOrder.isPending ||
                      !name.trim() ||
                      !email.trim() ||
                      phone.trim().length < 8 ||
                      !address.trim()
                    }
                  >
                    {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Đặt hàng — không cần thanh toán
                  </Button>
                ) : (
                  <Button asChild className="mt-2 w-full rounded-full" size="lg">
                    <Link href="/login?next=/cart">
                      <UserRound className="mr-2 h-4 w-4" /> Đăng nhập để đặt hàng
                    </Link>
                  </Button>
                )}
                <p className="text-center text-[11px] text-muted-foreground">
                  VHD Corp sẽ gọi điện/email xác nhận đơn và thống nhất giao hàng — không thu tiền online.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {items.length > 0 && <CartRecommendations productId={items[0].productId} />}
      </div>
    </>
  );
}

/** "Có thể bạn cũng thích" — gợi ý co-view theo sản phẩm đầu tiên trong giỏ. */
function CartRecommendations({ productId }: { productId: number }) {
  const q = useQuery({
    queryKey: ["cart-recs", productId],
    queryFn: () => productService.related(productId),
  });
  const recs = q.data ?? [];
  if (recs.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Sparkles className="h-5 w-5 text-brand-highlight" /> Có thể bạn cũng thích
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {recs.slice(0, 6).map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="group rounded-xl border bg-card p-2.5 transition-all hover:border-brand-primary/40 hover:shadow-md"
          >
            {p.images?.[0] ? (
              <Image
                src={p.images[0]}
                alt=""
                width={140}
                height={140}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ) : (
              <span className="grid aspect-square w-full place-items-center rounded-lg bg-brand-primary/10">
                <Package className="h-6 w-6 text-brand-primary" />
              </span>
            )}
            <p className="mt-2 line-clamp-1 text-xs font-medium group-hover:text-brand-primary">{p.name}</p>
            <PriceTag product={p} size="sm" className="mt-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
