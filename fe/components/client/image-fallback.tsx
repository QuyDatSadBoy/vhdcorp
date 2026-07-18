/**
 * Empty-state ảnh dùng chung cho product card / post card / category card.
 * Render hộp gradient brand + biểu tượng VHD — đồng nhất visual ngay cả khi chưa có ảnh.
 */
export function ImageFallback({
  label = "VHD Corp",
  variant = "product",
}: {
  label?: string;
  variant?: "product" | "post" | "category";
}) {
  const gradients: Record<string, string> = {
    product: "from-[#1B3A8C]/15 via-[#4FB8E7]/10 to-[#1B3A8C]/5",
    post: "from-[#1B3A8C]/10 via-[#F5A623]/8 to-[#4FB8E7]/8",
    category: "from-[#4FB8E7]/15 via-[#1B3A8C]/10 to-[#F5A623]/8",
  };
  const gradient = gradients[variant] ?? gradients.product;

  return (
    <div aria-hidden className={`absolute inset-0 grid place-items-center bg-linear-to-br ${gradient}`}>
      {/* Subtle dot pattern via CSS class */}
      <div className="fallback-dot-pattern absolute inset-0 opacity-[0.04]" />
      <div className="relative flex flex-col items-center gap-2.5">
        {/* Brand monogram with soft glow */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/60 ring-1 ring-white/40">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[#1B3A8C]/70"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1B3A8C]/50">{label}</span>
      </div>
    </div>
  );
}
