/**
 * Loading UI cho nhóm trang client — site render dynamic (real-time, no-store)
 * nên chuyển trang cần feedback ngay thay vì màn hình đứng im.
 */
export default function ClientLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-label="Đang tải trang"
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Đang tải…</p>
    </div>
  );
}
