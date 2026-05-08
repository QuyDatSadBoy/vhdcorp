import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/client/login-form";

export default function LoginPage() {
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-xl">
      <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
        ← Quay về trang chủ
      </Link>
      <h1 className="mt-2 text-center text-2xl font-bold">Đăng nhập</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Chào mừng bạn quay lại VHD Corp
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
