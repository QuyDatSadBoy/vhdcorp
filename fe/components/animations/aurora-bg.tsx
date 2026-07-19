interface Props {
  className?: string;
  /**
   * Cường độ hiệu ứng.
   * "subtle" → sections sáng / nhẹ
   * "medium" → sections tối
   * "vivid" → hero full-screen (dark bg)
   */
  intensity?: "subtle" | "medium" | "vivid";
}

/**
 * Aurora TĨNH — nhiều lớp radial-gradient xếp chồng trong MỘT div.
 *
 * Trước đây: 4 lớp motion.div với filter blur(60–90px) + animate scale/rotate lặp
 * vô hạn. Animate scale trên blur buộc trình duyệt re-rasterize blur mỗi frame →
 * đây chính là nguồn GIẬT khi cuộn tới mục "đánh giá" (chi phí GPU/compositor,
 * không hiện trong đo longtask nên đo thấy "0 giật" mà máy vẫn lag).
 *
 * Giờ: không animation, không filter blur, không will-change → 0 chi phí khi cuộn.
 * Vẫn giữ chiều sâu màu "wow" nhờ radial-gradient mềm (kiểu Stripe/Linear).
 */
export function AuroraBg({ className, intensity = "medium" }: Props) {
  const opMap = { subtle: 0.55, medium: 0.8, vivid: 1 };
  const op = opMap[intensity];

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{ opacity: op }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(60% 55% at 16% 20%, color-mix(in srgb, var(--vhd-color-primary) 50%, transparent) 0%, transparent 62%),
            radial-gradient(50% 50% at 86% 14%, color-mix(in srgb, var(--vhd-color-accent) 42%, transparent) 0%, transparent 60%),
            radial-gradient(58% 58% at 78% 92%, color-mix(in srgb, var(--vhd-color-highlight) 38%, transparent) 0%, transparent 62%),
            radial-gradient(52% 52% at 10% 90%, color-mix(in srgb, #22d3ee 34%, transparent) 0%, transparent 60%)
          `,
        }}
      />
      {/* Vignette mềm — cạnh dịu hơn để nội dung nổi bật */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_82%_82%_at_50%_50%,transparent_55%,color-mix(in_srgb,var(--foreground)_7%,transparent)_100%)]" />
    </div>
  );
}
