import type { ReactNode } from "react";
import { Header } from "@/components/client/header";
import { Footer } from "@/components/client/footer";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
