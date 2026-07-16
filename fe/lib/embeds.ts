/**
 * Chuẩn hóa link admin dán vào → URL nhúng (iframe src) chuyên nghiệp.
 * Admin chỉ cần dán: mã iframe, link chia sẻ, địa chỉ, hay URL video — tự xử lý hết.
 */

/** Google Maps: nhận mã iframe / link nhúng / địa chỉ text / link maps → src iframe */
export function toMapEmbedSrc(input: string | undefined | null): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  // 1) Dán nguyên mã <iframe …> → lấy src
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) return iframeMatch[1];
  // 2) Link nhúng sẵn (google.com/maps/embed?pb=… hoặc …output=embed)
  if (/\/maps\/embed|output=embed/i.test(raw)) return raw;
  // 3) Link maps thường hoặc địa chỉ text → tìm kiếm + nhúng
  return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&output=embed`;
}

/** Video: YouTube / TikTok / Facebook / Vimeo URL → src iframe; không nhận diện được → null */
export function toVideoEmbedSrc(input: string | undefined | null): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) return iframeMatch[1];
  // YouTube: watch?v= | youtu.be/ | shorts/
  const yt = raw.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // TikTok video
  const tt = raw.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
  if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;
  // Facebook video / reel
  if (/facebook\.com\/.*(video|watch|reel)/i.test(raw)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false`;
  }
  // Vimeo
  const vm = raw.match(/vimeo\.com\/(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/** Fanpage Facebook → src iframe Page Plugin (timeline) */
export function toFacebookPageSrc(
  pageUrl: string | undefined | null,
  opts: { width?: number; height?: number; showTimeline?: boolean } = {}
): string | null {
  const raw = (pageUrl ?? "").trim();
  if (!raw || !/facebook\.com\//i.test(raw)) return null;
  const { width = 340, height = 400, showTimeline = true } = opts;
  const params = new URLSearchParams({
    href: raw,
    tabs: showTimeline ? "timeline" : "",
    width: String(width),
    height: String(height),
    small_header: "true",
    adapt_container_width: "true",
    hide_cover: "false",
    show_facepile: "true",
  });
  return `https://www.facebook.com/plugins/page.php?${params.toString()}`;
}
