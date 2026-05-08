import Link from "next/link";
import { RegisterForm } from "@/components/client/register-form";

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-xl">
      <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">← Quay về trang chủ</Link>
      <h1 className="mt-2 text-center text-2xl font-bold">Đăng ký tài khoản</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">Tạo tài khoản miễn phí để khám phá dịch vụ</p>
      <RegisterForm />
    </div>
  );
}
