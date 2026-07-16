"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRegister } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z
  .object({
    name: z.string().min(2, "Tên tối thiểu 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Mật khẩu không khớp" });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await register.mutateAsync({ name: values.name, email: values.email, password: values.password });
      toast.success("Đã gửi mã xác minh tới email của bạn!");
      // Chuyển sang màn nhập mã OTP — tài khoản kích hoạt sau khi xác minh
      router.replace(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      toast.error(message);
    }
  }

  return (
    <motion.form
      suppressHydrationWarning
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Họ và tên</Label>
        <Input id="name" {...form.register("name")} aria-invalid={!!form.formState.errors.name} />
        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...form.register("confirm")}
          aria-invalid={!!form.formState.errors.confirm}
        />
        {form.formState.errors.confirm && (
          <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
        )}
      </div>
      <Button
        type="submit"
        className="h-11 w-full rounded-full bg-brand-primary text-base font-semibold text-white hover:bg-brand-primary/90"
        disabled={register.isPending}
      >
        {register.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Tạo tài khoản
      </Button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
          window.location.href = `${apiBase}/auth/google?next=${encodeURIComponent("/account/profile")}`;
        }}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C40.8 36.5 44 30.8 44 24c0-1.3-.1-2.4-.4-3.5z"
          />
        </svg>
        Đăng ký bằng Google
      </Button>

      <div className="text-center text-sm">
        <Link href="/login" className="text-brand-primary hover:underline">
          Đã có tài khoản? Đăng nhập
        </Link>
      </div>
    </motion.form>
  );
}
