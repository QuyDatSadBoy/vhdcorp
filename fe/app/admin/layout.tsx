"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { useMe } from "@/services/auth.service";

export default function AdminLayout({ children }: { children: ReactNode }) {
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

  if (isLogin) return <>{children}</>;

  // Chờ kiểm tra session
  if (isPending) return null;
  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
