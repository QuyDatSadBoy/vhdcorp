import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import Script from "next/script";
import { draftMode } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { getSiteConfig, themeCssVars, googleFontsUrl } from "@/lib/site-config";
import { buildMetadata } from "@/lib/seo";

const fontHeading = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading-base",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body-base",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata();
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b1f" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Chặn breakout khỏi thẻ <style> khi inject CSS admin nhập. */
function sanitizeCss(css: string): string {
  return css.replace(/<\/style/gi, "\\3C/style");
}

/** Analytics ID chỉ chấp nhận chữ/số/gạch — chống inject vào inline script. */
function safeId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : undefined;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteConfig = await getSiteConfig();
  const { isEnabled: isDraftPreview } = await draftMode();
  const seo = {
    ...siteConfig.seo,
    googleAnalyticsId: safeId(siteConfig.seo.googleAnalyticsId),
    googleTagManagerId: safeId(siteConfig.seo.googleTagManagerId),
    facebookPixelId: safeId(siteConfig.seo.facebookPixelId),
  };
  const fontsUrl = googleFontsUrl(siteConfig.theme);

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${fontHeading.variable} ${fontBody.variable} h-full antialiased`}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{${themeCssVars(siteConfig.theme)}}`,
          }}
        />
        {fontsUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={fontsUrl} />
          </>
        )}
        {siteConfig.customCss && (
          <style id="vhd-custom-css" dangerouslySetInnerHTML={{ __html: sanitizeCss(siteConfig.customCss) }} />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-body">
        {seo.googleTagManagerId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${seo.googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {isDraftPreview && (
          <div className="fixed bottom-4 left-4 z-[9999] flex items-center gap-3 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-lg">
            Đang xem trước bản nháp
            <a href="/api/preview/disable" className="underline underline-offset-2">
              Thoát
            </a>
          </div>
        )}
        <Providers initialSiteConfig={siteConfig}>{children}</Providers>
        {seo.googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="vhd-ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${seo.googleAnalyticsId}');`}
            </Script>
          </>
        )}
        {seo.googleTagManagerId && (
          <Script id="vhd-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.googleTagManagerId}');`}
          </Script>
        )}
        {seo.facebookPixelId && (
          <Script id="vhd-fbpixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.facebookPixelId}');fbq('track','PageView');`}
          </Script>
        )}
      </body>
    </html>
  );
}
