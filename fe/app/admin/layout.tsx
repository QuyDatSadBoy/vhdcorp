import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AdminClientShell from "./_admin-client-shell";

// Layout server cho admin — export metadata để override root title
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Quản trị",
    description: "Khu vực quản trị VHD Corp",
    noindex: true,
  });
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminClientShell>{children}</AdminClientShell>;
}
