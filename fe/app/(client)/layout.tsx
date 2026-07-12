import type { ReactNode } from "react";
import Header from "@/components/client/header";
import Footer from "@/components/client/footer";
import FloatingContact from "@/components/client/floating-contact";
import ChatWidgetLoader from "@/components/chat/chat-widget-loader";
import { StickyCtaBar } from "@/components/client/sticky-cta-bar";
import { BackToTop } from "@/components/client/back-to-top";
import { LenisProvider } from "@/components/animations/lenis-provider";
import { CustomCursor } from "@/components/animations/custom-cursor";
import { ScrollProgress } from "@/components/animations/scroll-progress";
import { NoiseOverlay } from "@/components/animations/scroll-velocity-row";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <LenisProvider>
      <ScrollProgress />
      <CustomCursor />
      <NoiseOverlay opacity={0.035} />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <StickyCtaBar />
        <BackToTop />
        <FloatingContact />
        <ChatWidgetLoader />
      </div>
    </LenisProvider>
  );
}
