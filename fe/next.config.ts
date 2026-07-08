import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép truy cập HMR từ các thiết bị trong mạng nội bộ khi dev
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "localhost", port: "8080" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
