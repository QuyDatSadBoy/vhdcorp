"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { useAdminLogin, useMe } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
type Values = z.infer<typeof schema>;

export function AdminLoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const login = useAdminLogin();
  const { data: meData, isPending: mePending } = useMe();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // Redirect nếu đã đăng nhập với role admin/staff
  useEffect(() => {
    if (mePending) return;
    const user = (meData as { user?: { role?: string } } | null | undefined)?.user;
    if (user?.role === "ADMIN" || user?.role === "STAFF") {
      router.replace("/admin/dashboard");
    }
  }, [meData, mePending, router]);

  async function onSubmit(values: Values) {
    try {
      const result = await login.mutateAsync(values);
      if (result.user.role !== "ADMIN" && result.user.role !== "STAFF") {
        toast.error("Tài khoản không có quyền truy cập admin");
        return;
      }
      setUser(result.user);
      toast.success(`Chào ${result.user.name}`);
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  }

  return (
    <motion.form
      suppressHydrationWarning
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="email" className="text-zinc-200">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
          className="bg-zinc-700 border-zinc-600 text-white"
        />
        {form.formState.errors.email && <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-zinc-200">
          Mật khẩu
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          className="bg-zinc-700 border-zinc-600 text-white"
        />
        {form.formState.errors.password && (
          <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
        Đăng nhập admin
      </Button>
    </motion.form>
  );
}
