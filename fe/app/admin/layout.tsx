import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
