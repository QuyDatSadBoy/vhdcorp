"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { ConfirmDialogProvider } from "@/components/admin/confirm-dialog";
import { useMe } from "@/services/auth.service";

export default function AdminClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");
  const router = useRouter();
  const { data, isPending } = useMe(!isLogin);

  const user = data as { role?: string } | null | undefined;
  const role = user?.role;
  const isAuthorized = role === "ADMIN" || role === "STAFF";

  useEffect(() => {
    if (isLogin) return;
    if (isPending) return;
    if (!isAuthorized) {
      router.replace("/admin/login");
    }
  }, [isLogin, isPending, isAuthorized, router]);

  // Cập nhật tiêu đề tab cho admin theo route (client component không export metadata được)
  useEffect(() => {
    if (isLogin) return;
    const seg = pathname?.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
    const label =
      (
        {
          dashboard: "Dashboard",
          products: "Sản phẩm",
          categories: "Danh mục",
          posts: "Bài viết",
          users: "Người dùng",
          reviews: "Đánh giá",
          banners: "Banner",
          media: "Thư viện ảnh",
          builder: "Page Builder",
          settings: "Cài đặt site",
        } as Record<string, string>
      )[seg] ?? "Quản trị";
    const newTitle = `${label} | Admin | VHD Corp`;
    // Override title sau khi Next runtime hoàn tất head sync.
    // Dùng MutationObserver vì Next có thể reset title nhiều lần.
    document.title = newTitle;
    document.body.setAttribute("data-admin-title-set", "1");
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => {
      if (document.title !== newTitle) document.title = newTitle;
    });
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, isLogin]);

  if (isLogin) return <>{children}</>;

  // Chờ kiểm tra session
  if (isPending) return null;
  if (!isAuthorized) return null;

  return (
    <ConfirmDialogProvider>
      <div className="flex h-screen overflow-hidden bg-muted/40">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ConfirmDialogProvider>
  );
}
