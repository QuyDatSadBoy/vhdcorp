import type { ReactNode } from "react";
import Header from "@/components/client/header";
import Footer from "@/components/client/footer";
import FloatingContact from "@/components/client/floating-contact";
import { StickyCtaBar } from "@/components/client/sticky-cta-bar";
import { BackToTop } from "@/components/client/back-to-top";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <StickyCtaBar />
      <BackToTop />
      <FloatingContact />
    </div>
  );
}
