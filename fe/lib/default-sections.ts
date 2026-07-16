import type { Section } from "@/types/site-config";
import { DEFAULT_HERO_TRUST_ITEMS } from "@/components/sections/hero";
import { DEFAULT_INDUSTRY_ITEMS } from "@/components/sections/industries";
import { DEFAULT_USE_CASES } from "@/components/sections/use-cases";
import { DEFAULT_PROCESS_STEPS } from "@/components/sections/process";
import { DEFAULT_FAQ_ITEMS } from "@/components/sections/faq-accordion";
import { DEFAULT_COMPARISON_COLUMNS, DEFAULT_COMPARISON_ROWS } from "@/components/sections/comparison-table";

/** Logo đối tác placeholder (chưa có ảnh → card chữ) — admin thay ảnh thật trong builder */
const DEFAULT_PARTNER_LOGOS = [
  "Sài Gòn Water",
  "Đông Nam Mech",
  "DMK Foods",
  "VietPlast",
  "Quốc Oai Coop",
  "VHD Logistics",
].map((name) => ({ image: "", name, link: "" }));

/**
 * Sections mặc định cho trang chủ — dùng khi DB chưa có cấu hình.
 * Admin có thể chỉnh hoặc thay thế hoàn toàn từ Builder.
 */
export function defaultHomeSections(): Section[] {
  return [
    {
      id: "hero-default",
      type: "hero",
      order: 1,
      visible: true,
      props: {
        badge: "B2B",
        trustItems: DEFAULT_HERO_TRUST_ITEMS,
        heading: "Tổng kho *nhựa*, cao su & *miến* truyền thống Việt",
        subheading:
          "VHD Corp là cầu nối giữa các sản phẩm Việt Nam chất lượng cao và thị trường toàn cầu. Đặt hàng B2B/B2C, giao nhanh toàn quốc.",
        ctaText: "Khám phá sản phẩm",
        ctaLink: "/products",
        align: "left",
        minHeight: 720,
        animation: "fade-up",
      },
    },
    {
      id: "industries-default",
      type: "industries",
      order: 2,
      visible: true,
      props: {
        heading: "Ba trụ cột kinh doanh của VHD Corp",
        subheading:
          "Từ vật tư công nghiệp đến đặc sản làng nghề — VHD Corp là đối tác cung ứng đa ngành, kết nối chất lượng Việt Nam với thị trường B2B/B2C.",
        items: DEFAULT_INDUSTRY_ITEMS,
      },
    },
    {
      id: "use-cases-default",
      type: "use-cases",
      order: 3,
      visible: true,
      props: {
        eyebrow: "Bài toán B2B",
        heading: "Chúng tôi giải quyết mọi nhu cầu cung ứng",
        subheading:
          "Từ đơn hàng đầu tiên đến hợp đồng dài hạn — VHD Corp đồng hành cùng doanh nghiệp Việt trong chuỗi cung ứng.",
        columns: 4,
        cases: DEFAULT_USE_CASES,
      },
    },
    {
      id: "stats-default",
      type: "stats-counter",
      order: 4,
      visible: true,
      props: {
        heading: "Con số nói lên sức mạnh VHD Corp",
        stats: [
          { label: "Đối tác doanh nghiệp", value: 120, unit: "+" },
          { label: "Sản phẩm cung cấp", value: 850, unit: "+" },
          { label: "Năm kinh nghiệm", value: 12, unit: "+" },
          { label: "Tỉnh thành phục vụ", value: 63 },
        ],
      },
    },
    {
      id: "featured-default",
      type: "featured-products",
      order: 5,
      visible: true,
      props: { heading: "Sản phẩm nổi bật", limit: 8, layout: "grid" },
    },
    {
      id: "feature-showcase-default",
      type: "feature-showcase",
      order: 6,
      visible: true,
      props: {
        eyebrow: "Tham quan VHD",
        heading: "Nhà máy đạt chuẩn ISO 9001 — minh chứng cho cam kết chất lượng",
        subheading:
          "Khách hàng B2B có thể đặt lịch tham quan trực tiếp dây chuyền sản xuất, quan sát kiểm định chất lượng từ nguyên liệu đến thành phẩm.",
        bullets: [
          "Diện tích nhà xưởng 12.000m² tại KCN Tân Bình",
          "Công suất 50.000 sản phẩm/tháng — sẵn đáp ứng đơn hàng OEM",
          "Đội ngũ 200+ kỹ sư + chuyên viên QA/QC",
          "Hệ thống ERP truy xuất nguồn gốc 100%",
        ],
        ctaText: "Đặt lịch tham quan",
        ctaLink: "/contact",
        badge: "EXCLUSIVE B2B",
        imageSide: "right",
      },
    },
    {
      id: "process-default",
      type: "process",
      order: 7,
      visible: true,
      props: {
        heading: "Quy trình hợp tác chuẩn hoá",
        subheading:
          "Năm bước minh bạch — từ tư vấn đến hậu mãi — đảm bảo trải nghiệm B2B/B2C nhất quán cho mọi khách hàng VHD.",
        steps: DEFAULT_PROCESS_STEPS,
      },
    },
    {
      id: "comparison-default",
      type: "comparison-table",
      order: 8,
      visible: true,
      props: {
        eyebrow: "So sánh gói dịch vụ",
        heading: "Chọn gói VHD phù hợp với quy mô của bạn",
        subheading:
          "Chính sách giá theo từng cấp độ hợp tác, đáp ứng nhu cầu đa dạng từ khách lẻ đến doanh nghiệp lớn.",
        columnHeaders: DEFAULT_COMPARISON_COLUMNS,
        rows: DEFAULT_COMPARISON_ROWS,
      },
    },
    {
      id: "testimonials-default",
      type: "testimonials",
      order: 9,
      visible: true,
      props: {
        quotes: [
          {
            name: "Nguyễn Văn Thắng",
            role: "Giám đốc kỹ thuật",
            company: "Công ty CP Cấp nước Sài Gòn",
            quote:
              "Ống nhựa PVC của VHD đáp ứng đầy đủ TCVN, giao nhanh và đội kỹ thuật tư vấn tận tâm — chúng tôi tin tưởng hợp tác dài hạn.",
          },
          {
            name: "Trần Thị Hương",
            role: "Trưởng phòng mua hàng",
            company: "Tập đoàn thực phẩm DMK",
            quote:
              "Miến VHD đóng gói chuẩn xuất khẩu, đáp ứng tiêu chuẩn HACCP — chúng tôi đã đưa sản phẩm vào hệ thống siêu thị 28 quốc gia.",
          },
          {
            name: "Phạm Đức Minh",
            role: "Tổng Giám đốc",
            company: "Cty TNHH Cơ khí Đông Nam",
            quote:
              "Tấm cao su NBR của VHD chịu dầu chịu nhiệt tốt — bộ phận máy móc giảm hỏng hóc 40%, tiết kiệm chi phí bảo trì đáng kể.",
          },
        ],
      },
    },
    {
      id: "faq-default",
      type: "faq-accordion",
      order: 10,
      visible: true,
      props: {
        eyebrow: "Câu hỏi thường gặp",
        heading: "Mọi điều bạn cần biết về VHD Corp",
        items: DEFAULT_FAQ_ITEMS,
      },
    },
    {
      id: "blog-default",
      type: "blog-preview",
      order: 11,
      visible: true,
      props: { heading: "Tin tức & Cập nhật", limit: 4, layout: "grid" },
    },
    {
      id: "cta-default",
      type: "contact-cta",
      order: 12,
      visible: true,
      props: {
        heading: "Sẵn sàng hợp tác cùng VHD Corp?",
        body: "Đội ngũ chuyên gia của chúng tôi sẵn sàng tư vấn giải pháp phù hợp nhất cho doanh nghiệp của bạn.",
        ctaText: "Liên hệ ngay",
        ctaLink: "/contact",
      },
    },
    {
      id: "partners-default",
      type: "partners",
      order: 13,
      visible: true,
      props: {
        heading: "Hơn 120+ doanh nghiệp đồng hành cùng VHD",
        logos: DEFAULT_PARTNER_LOGOS,
        grayscale: true,
        speed: 30,
      },
    },
  ];
}

/**
 * Sections mặc định cho trang Giới thiệu — tái tạo nội dung trang /about đang chạy
 * (sứ mệnh/tầm nhìn, hành trình, số liệu, giá trị cốt lõi) để admin chỉnh qua Builder.
 * Khi publish có section → client render PageRenderer thay giao diện dựng sẵn.
 */
export function defaultAboutSections(): Section[] {
  return [
    {
      id: "about-hero-default",
      type: "hero",
      order: 1,
      visible: true,
      props: {
        heading: "Kết nối giá trị – *Hợp tác vững bền*",
        subheading:
          "VHD Corp là tổng kho cung cấp sản phẩm nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam. Hơn một thập kỷ phát triển, chúng tôi tự hào là cầu nối tin cậy giữa nhà sản xuất Việt và khách hàng B2B/B2C trên toàn quốc.",
        ctaText: "Liên hệ hợp tác",
        ctaLink: "/contact",
        align: "left",
        minHeight: 520,
        animation: "fade-up",
      },
    },
    {
      id: "about-stats-default",
      type: "stats-counter",
      order: 2,
      visible: true,
      props: {
        stats: [
          { label: "Năm kinh nghiệm", value: 12, unit: "+" },
          { label: "Sản phẩm cung cấp", value: 850, unit: "+" },
          { label: "Đối tác sản xuất", value: 120, unit: "+" },
          { label: "Tỉnh thành phục vụ", value: 28 },
        ],
      },
    },
    {
      id: "about-pillars-default",
      type: "use-cases",
      order: 3,
      visible: true,
      props: {
        eyebrow: "Về VHD Corp",
        heading: "Sứ mệnh – Tầm nhìn – Giá trị cốt lõi",
        columns: 3,
        cases: [
          {
            emoji: "🎯",
            title: "Sứ mệnh",
            description:
              "Kết nối các nhà sản xuất Việt Nam với khách hàng B2B/B2C trên toàn quốc — sản phẩm chất lượng đồng nhất, giá hợp lý, dịch vụ tận tâm.",
          },
          {
            emoji: "👁️",
            title: "Tầm nhìn",
            description:
              "Trở thành tổng kho phân phối uy tín hàng đầu Việt Nam về nhựa, cao su kỹ thuật và đặc sản làng nghề — hiện diện tại 30+ quốc gia vào 2030.",
          },
          {
            emoji: "❤️",
            title: "Giá trị cốt lõi",
            description:
              "Chất lượng — Minh bạch — Hợp tác bền vững. Mỗi sản phẩm xuất kho là một cam kết về uy tín của VHD Corp.",
          },
        ],
      },
    },
    {
      id: "about-timeline-default",
      type: "sticky-story",
      order: 4,
      visible: true,
      props: {
        eyebrow: "Hành trình",
        heading: "12+ năm phát triển cùng doanh nghiệp Việt",
        steps: [
          {
            title: "2014 — Thành lập VHD Corp",
            description: "Khởi đầu với mảng phân phối ống nhựa PVC và phụ kiện công nghiệp.",
          },
          {
            title: "2018 — Mở rộng cao su kỹ thuật",
            description: "Tích hợp dòng tấm cao su non, cao su chống rung phục vụ nhà máy.",
          },
          {
            title: "2021 — Đặc sản làng nghề",
            description: "Bắt tay với các làng nghề Bắc Bộ — đưa miến, nông sản truyền thống ra thị trường.",
          },
          {
            title: "2024 — Nền tảng e-commerce",
            description: "Ra mắt website B2B/B2C, chuẩn hoá quy trình đặt hàng và giao nhận toàn quốc.",
          },
          {
            title: "2030 — Vươn ra quốc tế",
            description: "Mục tiêu phân phối tại 30+ quốc gia, ưu tiên Đông Nam Á và Đông Á.",
          },
        ],
      },
    },
    {
      id: "about-values-default",
      type: "use-cases",
      order: 5,
      visible: true,
      props: {
        eyebrow: "Văn hóa",
        heading: "Giá trị làm nên VHD Corp",
        columns: 4,
        cases: [
          {
            emoji: "🤝",
            title: "Hợp tác",
            description: "Đồng hành cùng nhà sản xuất và khách hàng — cùng phát triển dài hạn.",
          },
          {
            emoji: "🛡️",
            title: "Tin cậy",
            description: "Sản phẩm có chứng nhận ISO, kiểm định kỹ thuật và bảo hành rõ ràng.",
          },
          {
            emoji: "✨",
            title: "Đổi mới",
            description: "Liên tục cập nhật quy trình, công nghệ và mở rộng danh mục sản phẩm.",
          },
          {
            emoji: "💙",
            title: "Tận tâm",
            description: "Đội ngũ tư vấn sẵn sàng hỗ trợ 7 ngày/tuần — đặt khách hàng làm trọng tâm.",
          },
        ],
      },
    },
    {
      id: "about-cta-default",
      type: "contact-cta",
      order: 6,
      visible: true,
      props: {
        heading: "Trở thành đối tác của VHD Corp",
        body: "Nhận tư vấn giải pháp cung ứng và báo giá B2B trong 24 giờ làm việc.",
        ctaText: "Liên hệ hợp tác",
        ctaLink: "/contact",
      },
    },
  ];
}

/**
 * Sections mặc định cho trang Liên hệ — render PHÍA TRÊN form liên hệ sẵn có
 * (form + bản đồ luôn hiển thị bên dưới, không bị thay thế).
 */
export function defaultContactSections(): Section[] {
  return [
    {
      id: "contact-process-default",
      type: "process",
      order: 1,
      visible: true,
      props: {
        heading: "Quy trình hợp tác 4 bước",
        subheading: "Từ yêu cầu đầu tiên đến giao hàng — nhanh gọn, minh bạch.",
        steps: [
          {
            title: "Gửi yêu cầu",
            description: "Điền form bên dưới hoặc gọi hotline — mô tả nhu cầu sản phẩm/số lượng.",
          },
          {
            title: "Tư vấn & báo giá",
            description: "Chuyên viên phản hồi trong 24 giờ làm việc kèm báo giá chi tiết.",
          },
          {
            title: "Chốt đơn & chuẩn bị",
            description: "Ký hợp đồng/xác nhận đơn — kho chuẩn bị hàng, kiểm định chất lượng.",
          },
          {
            title: "Giao nhận & hậu mãi",
            description: "Giao toàn quốc, hỗ trợ chứng từ đầy đủ và bảo hành theo cam kết.",
          },
        ],
      },
    },
    {
      id: "contact-faq-default",
      type: "faq-accordion",
      order: 2,
      visible: true,
      props: {
        eyebrow: "Hỗ trợ",
        heading: "Câu hỏi thường gặp khi liên hệ",
        items: [
          {
            question: "Thời gian phản hồi báo giá là bao lâu?",
            answer:
              "Trong vòng 24 giờ làm việc kể từ khi nhận yêu cầu — đơn B2B số lượng lớn có chuyên viên phụ trách riêng.",
          },
          {
            question: "VHD Corp làm việc khung giờ nào?",
            answer: "Thứ 2 – Thứ 7, 8:00 – 17:30. Ngoài giờ vẫn nhận yêu cầu qua form/email và trợ lý AI trên website.",
          },
          {
            question: "Có hỗ trợ xuất hóa đơn VAT và hợp đồng B2B?",
            answer: "Có — đầy đủ hóa đơn VAT, hợp đồng nguyên tắc và công nợ linh hoạt cho đối tác doanh nghiệp.",
          },
          {
            question: "Giao hàng những khu vực nào?",
            answer: "Toàn quốc: nội thành Hà Nội 1–2 ngày, tỉnh thành khác 3–5 ngày làm việc tùy khu vực.",
          },
        ],
      },
    },
  ];
}

/**
 * Layout mẫu cho trang danh sách (Sản phẩm / Tin tức) — section hiển thị
 * PHÍA TRÊN danh sách, dùng làm banner khuyến mãi/giới thiệu.
 */
export function defaultListingSections(page: "products" | "posts"): Section[] {
  if (page === "products") {
    return [
      {
        id: "products-promo-default",
        type: "contact-cta",
        order: 1,
        visible: true,
        props: {
          heading: "Đơn B2B số lượng lớn? Nhận báo giá riêng trong 24h",
          body: "Chiết khấu theo số lượng, hỗ trợ hóa đơn VAT và công nợ linh hoạt cho doanh nghiệp.",
          ctaText: "Nhận báo giá B2B",
          ctaLink: "/contact",
        },
      },
    ];
  }
  return [
    {
      id: "posts-promo-default",
      type: "contact-cta",
      order: 1,
      visible: true,
      props: {
        heading: "Cần tư vấn sâu hơn về sản phẩm?",
        body: "Đội ngũ chuyên gia VHD sẵn sàng giải đáp mọi câu hỏi kỹ thuật và báo giá.",
        ctaText: "Liên hệ chuyên gia",
        ctaLink: "/contact",
      },
    },
  ];
}
