"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  LayoutDashboard,
  Users,
  Package,
  FolderTree,
  FileText,
  Star,
  ShoppingCart,
  BadgePercent,
  Mail,
  Image as ImageIcon,
  Megaphone,
  Wrench,
  Server as ServerIcon,
  LogOut,
  Settings,
  Sparkles,
  ChevronRight,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/client/theme-toggle";
import { usePublishedSiteConfig } from "@/services/site-config.service";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  /** Chỉ ADMIN thấy (STAFF ẩn) — dùng cho nhóm Hệ thống */
  adminOnly?: boolean;
}

/** Nhóm menu theo mục đích — gọn gàng, dễ tìm */
const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Nội dung",
    items: [
      { href: "/admin/products", label: "Sản phẩm", icon: Package },
      { href: "/admin/categories", label: "Danh mục", icon: FolderTree },
      { href: "/admin/posts", label: "Bài viết", icon: FileText },
      { href: "/admin/banners", label: "Banner", icon: Megaphone },
      { href: "/admin/media", label: "Thư viện ảnh", icon: ImageIcon },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
      { href: "/admin/vouchers", label: "Voucher", icon: BadgePercent },
    ],
  },
  {
    label: "Tương tác",
    items: [
      { href: "/admin/reviews", label: "Đánh giá", icon: Star },
      { href: "/admin/contacts", label: "Liên hệ", icon: Mail },
      { href: "/admin/users", label: "Người dùng", icon: Users },
    ],
  },
  {
    label: "Tuỳ chỉnh",
    items: [
      { href: "/admin/builder", label: "Page Builder", icon: Wrench },
      { href: "/admin/settings", label: "Cài đặt site", icon: Settings },
      { href: "/admin/knowledge", label: "Kiến thức AI", icon: Bot },
    ],
  },
  {
    label: "Hệ thống",
    adminOnly: true,
    items: [{ href: "/admin/server", label: "Server", icon: ServerIcon }],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  // Logo thật của site (config brand) cho chip thương hiệu — fallback chữ V
  const configQ = usePublishedSiteConfig();
  const logoUrl = configQ.data?.value?.brand?.logo?.url;
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const logout = useLogout();
  const router = useRouter();

  async function handleLogout() {
    await logout.mutateAsync().catch(() => undefined);
    clearAuth();
    router.replace("/admin/login");
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-foreground/8 bg-card/95 backdrop-blur-sm">
      {/* Brand */}
      <div className="border-b border-foreground/8 px-5 py-4">
        <Link href="/admin/dashboard" className="group flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo brand từ config
            <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm" />
          ) : (
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-brand-primary via-brand-primary to-brand-accent text-base font-bold text-white shadow-sm">
              <span className="relative z-10">V</span>
              <span className="absolute inset-0 bg-linear-to-br from-white/20 to-transparent" />
            </span>
          )}
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">VHD Admin</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Control Panel
            </span>
          </span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {navGroups
          .filter((group) => !group.adminOnly || user?.role === "ADMIN")
          .map((group) => (
            <div key={group.label}>
              <p className="mb-0.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              <ul className="space-y-px">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
                          active
                            ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/20"
                            : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.75 w-3.75 shrink-0 transition-transform",
                            active ? "" : "group-hover:scale-110"
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && <ChevronRight className="h-3 w-3 opacity-80" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </nav>

      {/* User card + logout */}
      <div className="border-t border-foreground/8 p-3">
        {user && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-muted/40 p-2.5">
            {/* Bấm vào tên/avatar → trang Thông tin cá nhân (sửa tên, đổi email, đổi mật khẩu) */}
            <Link
              href="/admin/profile"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:bg-muted/70"
              title="Thông tin cá nhân"
            >
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar admin (Cloudinary)
                <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand-primary/15 to-brand-accent/15 text-xs font-bold text-brand-primary">
                  {user.name?.[0]?.toUpperCase() ?? "A"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{user.name}</p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Sparkles className="h-2.5 w-2.5 text-brand-primary" />
                  <span className="font-medium uppercase tracking-wider">{user.role}</span>
                </p>
              </div>
            </Link>
            <ThemeToggle className="h-8 w-8 shrink-0" />
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-foreground/10 bg-background px-3 py-2 text-[13px] font-medium text-foreground/80 transition-all hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
