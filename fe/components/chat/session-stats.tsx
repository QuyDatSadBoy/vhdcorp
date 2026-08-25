"use client";

import { useMemo } from "react";
import type { UiChatMessage } from "@/types/chat";

/**
 * Thanh số liệu của cả cuộc trò chuyện, đặt sát dưới ô nhập.
 *
 * Hình thức lấy theo deepseek-harness (đo trực tiếp: 12px, màu dịu, sát đáy). Nội dung
 * thì chọn thứ có ích cho người bán hàng chứ không chép nguyên: harness đếm "turns /
 * steps / tokens" cho lập trình viên, ở đây người dùng quan tâm hỏi mấy câu, chờ trung
 * bình bao lâu, và bao nhiêu câu trả lời sẵn từ bộ đệm (tức không tốn tiền gọi mô hình).
 *
 * Không có gì để nói thì KHÔNG hiện — một thanh trống chỉ tổ chiếm chỗ.
 */
export default function SessionStats({ messages }: { messages: UiChatMessage[] }) {
  const stats = useMemo(() => {
    const answered = messages.filter((m) => m.role === "assistant" && m.metrics);
    if (!answered.length) return null;
    const asked = messages.filter((m) => m.role === "user").length;
    const cached = answered.filter((m) => m.metrics!.cached).length;
    const live = answered.filter((m) => !m.metrics!.cached);
    const avgTtft = live.length ? live.reduce((s, m) => s + m.metrics!.ttft, 0) / live.length : 0;
    const totalSec = answered.reduce((s, m) => s + m.metrics!.total, 0);
    return { asked, replied: answered.length, cached, avgTtft, totalSec };
  }, [messages]);

  if (!stats) return null;

  const parts = [
    `${stats.asked} câu hỏi`,
    stats.avgTtft > 0 ? `chờ trung bình ${stats.avgTtft.toFixed(1)}s` : null,
    `tổng ${stats.totalSec < 60 ? `${stats.totalSec.toFixed(0)}s` : `${Math.round(stats.totalSec / 60)} phút`}`,
    stats.cached > 0 ? `${stats.cached} câu trả sẵn` : null,
  ].filter(Boolean);

  return (
    <p className="px-3 pb-1.5 text-center text-[11px] tabular-nums text-muted-foreground/60">{parts.join(" · ")}</p>
  );
}
