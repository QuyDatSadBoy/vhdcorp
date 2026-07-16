"use client";

import { useEffect } from "react";

const SESSION_KEY = "vhd_sid";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Lấy/tạo session id khách (ẩn danh, localStorage) — dùng cho tracking + recommendation */
function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

/**
 * Ghi 1 lượt xem sản phẩm (fire-and-forget) — nền tảng cho gợi ý
 * "khách xem X cũng xem Y" và báo cáo lượt xem trong admin.
 */
export default function TrackProductView({ productId }: { productId: number }) {
  useEffect(() => {
    if (!productId) return;
    const timer = setTimeout(() => {
      // Chờ 2s: chỉ tính lượt xem thật (khách ở lại trang), bỏ qua bấm nhầm
      void fetch(`${API_URL}/track/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, sessionId: getSessionId() }),
        keepalive: true,
      }).catch(() => {
        /* tracking lỗi không ảnh hưởng trải nghiệm */
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [productId]);

  return null;
}
