import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép truy cập HMR từ các thiết bị trong mạng nội bộ khi dev
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;

export default nextConfig;
