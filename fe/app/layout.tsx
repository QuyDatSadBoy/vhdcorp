import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getSiteConfig, themeCssVars } from "@/lib/site-config";
import { buildMetadata } from "@/lib/seo";

const fontHeading = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteConfig = await getSiteConfig();

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
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-body">
        <Providers initialSiteConfig={siteConfig}>{children}</Providers>
      </body>
    </html>
  );
}
