import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Target, Eye, Heart, Handshake, ShieldCheck, Sparkles, Users, ArrowRight } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/components/seo/json-ld";
import { PageRenderer } from "@/components/sections";
import { PageHero } from "@/components/client/page-hero";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Giới thiệu",
    description:
      "VHD Corp — tổng kho nhựa PVC, cao su kỹ thuật và đặc sản miến làng nghề Việt Nam. Sứ mệnh, tầm nhìn, giá trị cốt lõi và hành trình 12+ năm phục vụ B2B/B2C.",
    canonical: `${SITE_URL}/about`,
  });
}

const PILLARS = [
  {
    icon: Target,
    title: "Sứ mệnh",
    body: "Kết nối các nhà sản xuất Việt Nam với khách hàng B2B/B2C trên toàn quốc, mang đến sản phẩm chất lượng đồng nhất, giá hợp lý và dịch vụ tận tâm.",
  },
  {
    icon: Eye,
    title: "Tầm nhìn",
    body: "Trở thành tổng kho phân phối uy tín hàng đầu Việt Nam về nhựa, cao su kỹ thuật và đặc sản làng nghề, được công nhận trên 30+ quốc gia vào năm 2030.",
  },
  {
    icon: Heart,
    title: "Giá trị cốt lõi",
    body: "Chất lượng — Minh bạch — Hợp tác bền vững. Mỗi sản phẩm xuất kho là một cam kết về chất lượng và uy tín của VHD Corp.",
  },
];

const VALUES = [
  { icon: Handshake, title: "Hợp tác", body: "Đồng hành cùng nhà sản xuất và khách hàng — cùng phát triển dài hạn." },
  { icon: ShieldCheck, title: "Tin cậy", body: "Sản phẩm có chứng nhận ISO, kiểm định kỹ thuật và bảo hành rõ ràng." },
  { icon: Sparkles, title: "Đổi mới", body: "Liên tục cập nhật quy trình, công nghệ và mở rộng danh mục sản phẩm." },
  { icon: Users, title: "Tận tâm", body: "Đội ngũ tư vấn sẵn sàng hỗ trợ 7 ngày/tuần — đặt khách hàng làm trọng tâm." },
];

const TIMELINE = [
  {
    year: "2014",
    title: "Thành lập VHD Corp",
    body: "Khởi đầu với mảng phân phối ống nhựa PVC và phụ kiện công nghiệp.",
  },
  {
    year: "2018",
    title: "Mở rộng cao su kỹ thuật",
    body: "Tích hợp dòng tấm cao su non, cao su chống rung phục vụ nhà máy.",
  },
  {
    year: "2021",
    title: "Đặc sản làng nghề",
    body: "Bắt tay với các làng nghề Bắc Bộ — đưa miến, nông sản truyền thống ra thị trường.",
  },
  {
    year: "2024",
    title: "Nền tảng e-commerce",
    body: "Ra mắt website B2B/B2C, chuẩn hoá quy trình đặt hàng và giao nhận toàn quốc.",
  },
  {
    year: "2030",
    title: "Vươn ra quốc tế",
    body: "Mục tiêu phân phối tại 30+ quốc gia, ưu tiên Đông Nam Á và Đông Á.",
  },
];

const STATS = [
  { value: "12+", label: "Năm kinh nghiệm" },
  { value: "850+", label: "Sản phẩm cung cấp" },
  { value: "120+", label: "Đối tác sản xuất" },
  { value: "28", label: "Tỉnh thành phục vụ" },
];

export default async function AboutPage() {
  const config = await getSiteConfig();
  const sections = config.pages.about?.sections ?? [];

  // Nếu admin đã build trang giới thiệu qua Page Builder → render đầy đủ.
  if (sections.length > 0) return <PageRenderer sections={sections} />;

  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Về VHD Corp"
        title="Kết nối giá trị – Hợp tác vững bền"
        description="VHD Corp là tổng kho cung cấp sản phẩm nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam. Hơn một thập kỷ phát triển, chúng tôi tự hào trở thành cầu nối tin cậy giữa nhà sản xuất Việt và khách hàng B2B/B2C trên toàn quốc."
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Giới thiệu" }]}
      />

      {/* Stats strip */}
      <section className="border-b border-foreground/8">
        <div className="container mx-auto grid grid-cols-2 gap-y-10 px-4 py-14 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="font-heading text-4xl font-extrabold tracking-tight text-brand-primary md:text-5xl"
                style={{ fontFeatureSettings: '"tnum" 1' }}
              >
                {s.value}
              </p>
              <p className="mt-2 text-sm text-foreground/60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="type-eyebrow text-brand-primary">Định hướng</p>
          <h2 className="mt-3 type-display-md text-foreground">Ba trụ cột làm nên VHD Corp</h2>
          <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <article
                key={p.title}
                className="group relative overflow-hidden rounded-3xl border border-foreground/8 bg-card p-7 transition-all hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-lg"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-bold text-foreground">{p.title}</h3>
                <p className="mt-3 text-foreground/65">{p.body}</p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-(--vhd-color-highlight)/10 transition-all duration-500 group-hover:scale-150"
                />
              </article>
            );
          })}
        </div>
      </section>

      {/* Brand story split */}
      <section className="bg-(--vhd-color-surface)/60 dark:bg-white/[0.04] py-20">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="type-eyebrow text-brand-primary">Câu chuyện thương hiệu</p>
            <h2 className="mt-3 type-display-md text-foreground">
              Hành trình từ <span className="word-highlight">làng nghề</span> ra thế giới
            </h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
            <div className="mt-6 space-y-4 text-foreground/70">
              <p>
                VHD Corp khởi nghiệp năm 2014 với một niềm tin đơn giản:{" "}
                <strong className="text-foreground">sản phẩm Việt xứng đáng có hệ thống phân phối chuyên nghiệp</strong>
                . Từ vài đơn hàng ống nhựa đầu tiên cho doanh nghiệp địa phương, chúng tôi từng bước xây dựng tổng kho
                850+ SKU, hợp tác cùng 120+ nhà sản xuất.
              </p>
              <p>
                Logo VHD — hai bàn tay nắm chặt dưới mái nhà — là cam kết của chúng tôi:{" "}
                <strong className="text-foreground">đứng cùng đối tác Việt</strong>, mang giá trị thực đến tay người
                dùng cuối, và xây dựng nền tảng hợp tác bền vững giữa các bên.
              </p>
            </div>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-primary/90"
            >
              Hợp tác cùng chúng tôi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-brand-primary">
            <div
              aria-hidden
              className="absolute inset-0 [background:radial-gradient(80%_60%_at_50%_50%,color-mix(in_srgb,var(--vhd-color-accent)_55%,transparent)_0%,transparent_70%),radial-gradient(60%_45%_at_85%_85%,color-mix(in_srgb,var(--vhd-color-highlight)_45%,transparent)_0%,transparent_70%)]"
            />
            <div className="relative grid h-full place-items-center p-12">
              <Image
                src={config.brand.logo.url || "/images/vhdcorplogo.jpeg"}
                alt={config.brand.siteName}
                width={420}
                height={420}
                className="h-72 w-72 rounded-2xl bg-white object-contain p-6 shadow-2xl md:h-80 md:w-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="type-eyebrow text-brand-primary">Giá trị</p>
          <h2 className="mt-3 type-display-md text-foreground">Chuẩn mực cốt lõi của VHD</h2>
          <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-2xl border border-foreground/8 bg-card p-6 transition-all hover:border-[color:var(--vhd-color-highlight)]/40 hover:shadow-md"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-(--vhd-color-highlight)/15 text-brand-highlight">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-heading text-base font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">{v.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-(--vhd-color-surface)/60 dark:bg-white/[0.04] py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 max-w-2xl">
            <p className="type-eyebrow text-brand-primary">Mốc thời gian</p>
            <h2 className="mt-3 type-display-md text-foreground">Hành trình phát triển</h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
          </div>
          <ol className="relative ml-3 border-l-2 border-(--vhd-color-primary)/15">
            {TIMELINE.map((it, i) => (
              <li key={it.year} className="ml-8 pb-10 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[11px] grid h-5 w-5 place-items-center rounded-full bg-brand-primary ring-4 ring-background"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-(--vhd-color-highlight)" />
                </span>
                <div className="rounded-2xl border border-foreground/8 bg-card p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-accent">{it.year}</p>
                  <h3 className="mt-1 font-heading text-lg font-bold text-foreground">{it.title}</h3>
                  <p className="mt-2 text-foreground/65">{it.body}</p>
                </div>
                {i === TIMELINE.length - 1 && (
                  <div className="mt-3 ml-1 inline-flex items-center gap-2 rounded-full bg-(--vhd-color-highlight)/15 px-3 py-1 text-xs font-semibold text-brand-primary">
                    <Sparkles className="h-3 w-3" />
                    Mục tiêu năm 2030
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-primary p-10 text-center text-white md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-highlight/25 blur-3xl"
          />
          <div className="relative">
            <p className="type-eyebrow text-brand-highlight">Sẵn sàng khám phá?</p>
            <h2 className="mt-3 type-display-md text-white">
              Cùng VHD Corp xây dựng <span className="word-highlight">giá trị bền vững</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/80">
              Đội ngũ tư vấn của chúng tôi sẵn sàng giải đáp về sản phẩm, báo giá và lịch giao hàng B2B/B2C trên toàn
              quốc.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-(--vhd-color-highlight) px-7 text-base font-semibold text-brand-primary hover:brightness-95"
              >
                Liên hệ ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex h-12 items-center rounded-full border border-white/30 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
              >
                Xem sản phẩm
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
