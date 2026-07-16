"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { authApi } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Quên mật khẩu — 2 bước:
 * 1) Nhập email → BE gửi mã OTP 6 số về Gmail thật.
 * 2) Nhập mã + mật khẩu mới → đặt lại, đăng xuất mọi phiên cũ.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) {
      toast.error("Nhập email đã đăng ký");
      return;
    }
    try {
      setBusy(true);
      const r = await authApi.forgotPassword(email.trim());
      toast.success(r.message);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi mã thất bại");
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (code.trim().length !== 6 || newPassword.length < 6) {
      toast.error("Nhập mã 6 chữ số và mật khẩu mới tối thiểu 6 ký tự");
      return;
    }
    try {
      setBusy(true);
      const r = await authApi.resetPassword({ email: email.trim(), code: code.trim(), newPassword });
      toast.success(r.message);
      router.replace("/login");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mã không đúng hoặc đã hết hạn");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-xl">
      <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
        ← Quay lại đăng nhập
      </Link>
      <div className="mt-4 flex justify-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
          <KeyRound className="h-7 w-7" />
        </span>
      </div>
      <h1 className="mt-3 text-center text-2xl font-bold">Quên mật khẩu</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {step === 1
          ? "Nhập email đã đăng ký — chúng tôi sẽ gửi mã đặt lại mật khẩu"
          : `Đã gửi mã tới ${email} (kiểm tra cả mục Spam)`}
      </p>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendCode()}
              placeholder="ban@gmail.com"
            />
          </div>
          <Button className="w-full" onClick={() => void sendCode()} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gửi mã đặt lại
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Mã xác minh</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="text-center text-2xl font-bold tracking-[0.5em]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newpass">Mật khẩu mới (≥ 6 ký tự)</Label>
            <Input
              id="newpass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void doReset()}
            />
          </div>
          <Button className="w-full" onClick={() => void doReset()} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đặt lại mật khẩu
          </Button>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="w-full text-center text-sm text-brand-primary hover:underline disabled:opacity-50"
          >
            Gửi lại mã
          </button>
        </div>
      )}
    </div>
  );
}
