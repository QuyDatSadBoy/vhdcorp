import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Header from "@/components/client/header";
import Footer from "@/components/client/footer";
import AccountClientShell from "./_account-client-shell";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Tài khoản",
    description: "Quản lý hồ sơ và bảo mật tài khoản VHD Corp",
    noindex: true,
  });
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  // Header/Footer thật của site — khu tài khoản luôn có đường về trang chủ
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <AccountClientShell>{children}</AccountClientShell>
      </main>
      <Footer />
    </div>
  );
}
