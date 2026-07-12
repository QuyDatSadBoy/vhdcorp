import Link from "next/link";
import Image from "next/image";
import { RegisterForm } from "@/components/client/register-form";
import { getSiteConfig } from "@/lib/site-config";

export default async function RegisterPage() {
  const config = await getSiteConfig();
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-xl">
      <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
        ← Quay về trang chủ
      </Link>
      {config.brand.logo.url && (
        <div className="mt-4 flex justify-center">
          <Image
            src={config.brand.logo.url}
            alt={config.brand.siteName}
            width={72}
            height={72}
            className="size-18 rounded-2xl bg-white object-contain p-1 shadow-sm ring-1 ring-border"
            priority
          />
        </div>
      )}
      <h1 className="mt-3 text-center text-2xl font-bold">Đăng ký tài khoản</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">Tạo tài khoản miễn phí để khám phá dịch vụ</p>
      <RegisterForm />
    </div>
  );
}
