interface JsonLdProps {
  id: string;
  data: Record<string, unknown>;
}

export function JsonLd({ id, data }: JsonLdProps) {
  // Escape "<" để chuỗi chứa "</script>" trong data không phá vỡ thẻ script (XSS-safe).
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script id={`ld-${id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
