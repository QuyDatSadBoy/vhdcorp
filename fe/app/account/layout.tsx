"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, Lock, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AccountLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const logout = useLogout();

  useEffect(() => {
    if (isHydrated && !user) router.replace(`/login?next=${pathname}`);
  }, [isHydrated, user, router, pathname]);

  async function handleLogout() {
    await logout.mutateAsync().catch(() => undefined);
    clearAuth();
    router.replace("/");
  }

  const isGoogleAccount = Boolean(user?.googleId);
  const items = [
    { href: "/account/profile", label: "Hồ sơ", icon: User },
    ...(isGoogleAccount ? [] : [{ href: "/account/password", label: "Đổi mật khẩu", icon: Lock }]),
  ];

  useEffect(() => {
    if (isHydrated && user && isGoogleAccount && pathname === "/account/password") {
      router.replace("/account/profile");
    }
  }, [isHydrated, user, isGoogleAccount, pathname, router]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active ? "bg-brand-primary/10 text-brand-primary font-medium" : "hover:bg-accent/40",
                )}
              >
                <Icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
          </Button>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
