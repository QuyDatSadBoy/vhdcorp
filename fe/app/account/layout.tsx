import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AccountClientShell from "./_account-client-shell";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Tài khoản",
    description: "Quản lý hồ sơ và bảo mật tài khoản VHD Corp",
    noindex: true,
  });
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountClientShell>{children}</AccountClientShell>;
}
