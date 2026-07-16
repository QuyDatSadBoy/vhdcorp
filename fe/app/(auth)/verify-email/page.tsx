"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { authApi, useVerifyEmail } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const verify = useVerifyEmail();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);

  const submit = async () => {
    if (!email.trim() || code.trim().length !== 6) {
      toast.error("Nhập email và mã xác minh 6 chữ số");
      return;
    }
    try {
      const result = await verify.mutateAsync({ email: email.trim(), code: code.trim() });
      setUser(result.user);
      toast.success("Xác minh thành công — chào mừng bạn đến VHD Corp!");
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mã không đúng hoặc đã hết hạn");
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Nhập email trước");
      return;
    }
    try {
      setResending(true);
      const r = await authApi.resendVerification(email.trim());
      toast.success(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi lại mã thất bại");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-xl">
      <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
        ← Quay về trang chủ
      </Link>
      <div className="mt-4 flex justify-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
          <MailCheck className="h-7 w-7" />
        </span>
      </div>
      <h1 className="mt-3 text-center text-2xl font-bold">Xác minh email</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Nhập mã 6 chữ số đã gửi tới hộp thư của bạn (kiểm tra cả mục Spam)
      </p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@gmail.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Mã xác minh</Label>
          <Input
            id="code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder="••••••"
            className="text-center text-2xl font-bold tracking-[0.5em]"
          />
        </div>
        <Button className="w-full" onClick={() => void submit()} disabled={verify.isPending}>
          {verify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Xác minh & đăng nhập
        </Button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resending}
          className="w-full text-center text-sm text-brand-primary hover:underline disabled:opacity-50"
        >
          {resending ? "Đang gửi lại…" : "Chưa nhận được mã? Gửi lại"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
