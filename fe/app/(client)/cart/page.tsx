import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/components/seo/json-ld";
import CartPageClient from "./_components/cart-page-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Giỏ hàng",
    description: "Giỏ hàng VHD Corp — đặt hàng nhanh, không cần thanh toán online, đội ngũ liên hệ xác nhận trong 24h.",
    canonical: `${SITE_URL}/cart`,
  });
}

export default function CartPage() {
  return <CartPageClient />;
}
