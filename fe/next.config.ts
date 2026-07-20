import type { NextConfig } from "next";

// Pin Turbopack root vào thư mục fe. LƯU Ý: không được thêm lockfile (yarn.lock)
// ở repo root — Next/Tailwind sẽ suy luận workspace root = repo root và resolve
// `@import "tailwindcss"` từ root node_modules (không tồn tại) → build fail.
const feRoot = import.meta.dirname ?? process.cwd();

const nextConfig: NextConfig = {
  // Gộp tín hiệu SEO về 1 URL duy nhất: www → apex 301 (Google starter guide,
  // mục "Nội dung trùng lặp" — canonical đã có, 301 là chuẩn đầy đủ).
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vhdcorp.com" }],
        destination: "https://vhdcorp.com/:path*",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: feRoot,
  },
  // Cho phép truy cập HMR từ các thiết bị trong mạng nội bộ khi dev
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
  images: {
    // Tối ưu ảnh Cloudinary ngay trên CDN (webp/avif + nén + resize) — nhẹ, nhanh,
    // không tốn optimizer của Next server.
    loader: "custom",
    loaderFile: "./lib/cloudinary-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "localhost", port: "8080" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
