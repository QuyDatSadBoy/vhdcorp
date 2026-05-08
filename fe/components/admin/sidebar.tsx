"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Package, FolderTree, FileText, Star,
  Image as ImageIcon, Megaphone, Wrench, LogOut, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/categories", label: "Danh mục", icon: FolderTree },
  { href: "/admin/posts", label: "Bài viết", icon: FileText },
  { href: "/admin/reviews", label: "Đánh giá", icon: Star },
  { href: "/admin/banners", label: "Banner", icon: Megaphone },
  { href: "/admin/media", label: "Thư viện ảnh", icon: ImageIcon },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/settings", label: "Cài đặt site", icon: Settings },
  { href: "/admin/builder", label: "Page Builder", icon: Wrench },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const logout = useLogout();
  const router = useRouter();

  async function handleLogout() {
    await logout.mutateAsync().catch(() => undefined);
    clearAuth();
    router.replace("/admin/login");
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r bg-card h-full flex-col">
      <div className="p-6 border-b">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-linear-to-br from-brand-primary to-brand-accent text-white">V</span>
          Admin
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-brand-primary/10 text-brand-primary font-medium" : "text-foreground/80 hover:bg-accent/40",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        {user && (
          <div className="mb-3 rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <p className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">{user.role}</p>
          </div>
        )}
        <Button variant="outline" onClick={handleLogout} className="w-full justify-start">
          <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
