import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ScrollJourneySection } from "@/types/site-config";

/**
 * ScrollJourney — "scroll world" THUẦN CSS: cuộn trang là bay qua các cảnh của VHD.
 *
 * Kỹ thuật: mỗi cảnh là 1 panel `position: sticky; top: 0; height: 100svh` xếp
 * chồng — cảnh sau trượt đè lên cảnh trước khi cuộn (hiệu ứng "takeover" kiểu
 * Apple). 100% compositor: không JS, không video, không blur động → siêu nhẹ.
 * Ảnh dùng next/image (Cloudinary f_auto/q_auto) + lazy load vì nằm dưới fold.
 * Parallax chữ nhẹ qua CSS view-timeline khi trình duyệt hỗ trợ (tự tắt khi không).
 */

const DEFAULT_SCENES: NonNullable<ScrollJourneySection["props"]["scenes"]> = [
  {
    image: "https://res.cloudinary.com/vhdcorp/image/upload/v1784395013/products/belbhfxlhefihoc7jibj.png",
    eyebrow: "01 · Kho tổng",
    title: "Kho tổng vật tư điện lạnh & cơ điện",
    body: "Gas lạnh, ống đồng, xốp bảo ôn, băng dính, dây điện… đủ chủng loại, sẵn số lượng lớn cho đại lý và nhà thầu.",
    tag: "Bán sỉ toàn quốc",
  },
  {
    image: "https://res.cloudinary.com/vhdcorp/image/upload/v1784395032/products/yygggaxgcgtdjjlqz2rf.webp",
    eyebrow: "02 · Cao su kỹ thuật",
    title: "Gioăng đai treo · gioăng bích · tấm cao su",
    body: "Dòng bán chạy nhất của VHD — đủ quy cách EPDM/NBR, nhận cắt theo bản vẽ, giao nhanh.",
    tag: "Bán chạy nhất",
  },
  {
    image: "https://res.cloudinary.com/vhdcorp/image/upload/v1784395048/products/yiweh2rqqzhgqsyd4qz9.jpg",
    eyebrow: "03 · Sản xuất",
    title: "Khuôn mẫu & đúc nhựa theo yêu cầu",
    body: "Xưởng khuôn mẫu cơ khí chính xác — từ thiết kế đến ra thành phẩm nhựa hàng loạt.",
    tag: "Nhà sản xuất",
  },
  {
    image: "https://res.cloudinary.com/vhdcorp/image/upload/v1784395078/products/k92rjuwbylcwl62tbsxg.jpg",
    eyebrow: "04 · Đồng hành",
    title: "Kết nối giá trị — hợp tác vững bền",
    body: "Báo giá nhanh theo số lượng, xuất hóa đơn đầy đủ, hỗ trợ kỹ thuật 1-1 cho khách B2B.",
    tag: "Liên hệ báo giá",
  },
];

export default function ScrollJourney({ section }: { section: ScrollJourneySection }) {
  const p = section.props;
  const scenes = p.scenes?.length ? p.scenes : DEFAULT_SCENES;
  const last = scenes.length - 1;

  return (
    <section aria-label={p.heading ?? "Hành trình VHD"}>
      {scenes.map((s, i) => (
        <div key={i} className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Ảnh nền cảnh — cover, tối dần về đáy cho chữ nổi */}
          <div className="absolute inset-0 sj-zoom">
            {s.image ? (
              <Image
                src={s.image}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                // dưới fold → lazy; Cloudinary loader tự f_auto/q_auto
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(90%_90%_at_20%_15%,color-mix(in_srgb,var(--vhd-color-accent)_45%,transparent),transparent),linear-gradient(180deg,#0d1f4d,#122a68)]" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-[#050c1a]/92 via-[#0d1f4d]/55 to-[#0d1f4d]/25" />
          </div>

          {/* Copy của cảnh — trồi lên nhẹ theo scroll (view-timeline, tự tắt nếu không hỗ trợ) */}
          <div className="relative z-10 flex h-full items-end">
            <div className="container mx-auto px-4 pb-20 md:pb-28">
              <div className="sj-copy max-w-2xl">
                {s.tag && (
                  <span className="inline-flex rounded-full bg-brand-highlight px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-primary shadow">
                    {s.tag}
                  </span>
                )}
                {s.eyebrow && (
                  <p className="mt-4 font-mono text-sm font-bold uppercase tracking-[0.2em] text-(--vhd-color-accent)">
                    {s.eyebrow}
                  </p>
                )}
                <h2 className="mt-3 font-heading text-3xl font-black leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
                  {s.title}
                </h2>
                {s.body && <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">{s.body}</p>}
                {i === last && (
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 rounded-full bg-brand-highlight px-6 py-3 text-sm font-bold text-brand-primary transition-transform hover:scale-[1.03]"
                    >
                      Xem sản phẩm
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 rounded-full border border-white/35 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                    >
                      Liên hệ báo giá
                    </Link>
                  </div>
                )}
              </div>

              {/* Chỉ số cảnh + thanh tiến trình nhỏ */}
              <div className="mt-10 flex items-center gap-2" aria-hidden>
                {scenes.map((_, d) => (
                  <span
                    key={d}
                    className={
                      "h-1 rounded-full transition-all " + (d === i ? "w-10 bg-brand-highlight" : "w-4 bg-white/25")
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
