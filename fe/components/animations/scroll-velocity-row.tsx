"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * ScrollVelocityRow — băng chữ chạy ngang (marquee) THUẦN CSS.
 *
 * Trước đây dùng framer useAnimationFrame: vòng lặp JS chạy MỖI FRAME mãi mãi
 * (kể cả khi băng chữ ngoài màn hình) → tốn main-thread khi cuộn. Giờ là
 * animation CSS transform trên compositor — 0 JS mỗi frame, tự tôn trọng
 * prefers-reduced-motion (CSS).
 *
 * Loop liền mạch: 2 nửa nội dung giống hệt nhau + translateX(-50%).
 */
export function ScrollVelocityRow({
  children,
  baseVelocity = 40,
  className,
}: {
  children: ReactNode;
  /** Tốc độ tương đối (giữ API cũ) — số càng lớn chạy càng nhanh. */
  baseVelocity?: number;
  className?: string;
}) {
  // Map tốc độ cũ → thời lượng CSS (baseVelocity 12 ≈ 40s / vòng, 40 ≈ 12s)
  const duration = Math.max(8, Math.round(480 / Math.max(1, baseVelocity)));

  return (
    <div className={`relative overflow-x-clip overflow-y-visible whitespace-nowrap ${className ?? ""}`}>
      <div
        className="css-marquee flex w-max flex-nowrap whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <span key={i} aria-hidden={i === 1} className="mx-8 inline-block">
            {children}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * NoiseOverlay — film grain mịn full-screen, fixed, blend-mode overlay.
 * Tăng cảm giác premium, "Renaissance painterly" như Shopify Editions.
 */
export function NoiseOverlay({ opacity = 0.04 }: { opacity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.opacity = String(opacity);
  }, [opacity]);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-1 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.85%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')]"
    />
  );
}
