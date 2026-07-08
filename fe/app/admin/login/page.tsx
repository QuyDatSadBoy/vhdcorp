import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
        <p className="text-sm text-zinc-400 mt-1">Đăng nhập để quản trị hệ thống VHD Corp</p>
      </div>
      <AdminLoginForm />
    </div>
  );
}
