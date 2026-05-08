interface JsonLdProps {
  id: string;
  data: Record<string, unknown>;
}

export function JsonLd({ id, data }: JsonLdProps) {
  return (
    <script
      id={`ld-${id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
