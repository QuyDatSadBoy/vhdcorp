import type { ReactNode } from "react";
import Header from "@/components/client/header";
import Footer from "@/components/client/footer";
import FloatingContact from "@/components/client/floating-contact";
import ChatWidgetLoader from "@/components/chat/chat-widget-loader";
import { StickyCtaBar } from "@/components/client/sticky-cta-bar";
import { BackToTop } from "@/components/client/back-to-top";
import { ScrollProgress } from "@/components/animations/scroll-progress";

// Đã bỏ smooth-scroll (Lenis) + custom cursor để cuộn/tương tác mượt, nhẹ, chuẩn native.
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollProgress />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <StickyCtaBar />
        <BackToTop />
        <FloatingContact />
        <ChatWidgetLoader />
      </div>
    </>
  );
}
