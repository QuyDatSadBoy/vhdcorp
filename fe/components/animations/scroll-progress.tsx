/**
 * ScrollProgress — thanh tiến độ cuộn ở đỉnh trang (brand gradient).
 *
 * Dùng CSS scroll-timeline thuần (animation-timeline: scroll()) → chạy 100% trên
 * compositor, KHÔNG tốn JS mỗi frame (trước đây dùng framer useScroll + useSpring).
 * Trình duyệt cũ không hỗ trợ thì thanh ẩn — không ảnh hưởng gì (chỉ trang trí).
 */
export function ScrollProgress() {
  return (
    <div
      aria-hidden
      className="scroll-progress-bar pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 origin-left scale-x-0 bg-linear-to-r from-brand-primary via-brand-accent to-brand-highlight"
    />
  );
}
