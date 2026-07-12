import { Suspense } from "react";
import Image from "next/image";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getSiteConfig } from "@/lib/site-config";

export default async function AdminLoginPage() {
  const config = await getSiteConfig();
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-8 shadow-2xl">
      <div className="mb-6 text-center">
        {config.brand.logo.url && (
          <div className="mb-4 flex justify-center">
            <Image
              src={config.brand.logo.url}
              alt={config.brand.siteName}
              width={72}
              height={72}
              className="size-18 rounded-2xl bg-white object-contain p-1 shadow-lg"
              priority
            />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
        <p className="text-sm text-zinc-400 mt-1">Đăng nhập để quản trị hệ thống {config.brand.siteName}</p>
      </div>
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
