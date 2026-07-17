import type { Section } from "@/types/site-config";
import { DEFAULT_HERO_TRUST_ITEMS } from "@/components/sections/hero";
import { DEFAULT_FAQ_ITEMS } from "@/components/sections/faq-accordion";

/**
 * Sections mặc định cho trang chủ — dùng khi DB chưa có cấu hình.
 * Gọn gàng: Hero → Về chúng tôi (khối + slide giới thiệu) → Sản phẩm →
 * Đánh giá → FAQ → Tin tức → Liên hệ. Admin chỉnh/thay hoàn toàn từ Builder.
 */
export function defaultHomeSections(): Section[] {
  return [
    {
      id: "hero-default",
      type: "hero",
      order: 1,
      visible: true,
      props: {
        badge: "B2B & B2C",
        trustItems: DEFAULT_HERO_TRUST_ITEMS,
        heading: "Tổng kho *nhựa*, cao su & *miến* truyền thống Việt",
        subheading:
          "VHD Corp phân phối sản phẩm nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam — phục vụ cả khách lẻ và doanh nghiệp, giao hàng toàn quốc.",
        ctaText: "Khám phá sản phẩm",
        ctaLink: "/products",
        align: "left",
        minHeight: 720,
        animation: "fade-up",
      },
    },
    {
      id: "about-intro-default",
      type: "feature-showcase",
      order: 2,
      visible: true,
      props: {
        eyebrow: "Về chúng tôi",
        heading: "VHD Corp — kết nối sản phẩm Việt với khách hàng",
        subheading:
          "Chúng tôi là đơn vị phân phối sản phẩm nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam. Cam kết đơn giản: hàng đúng mô tả, giá hợp lý, hỗ trợ tận tâm.",
        bullets: [
          "Đa dạng sản phẩm nhựa, cao su và đặc sản làng nghề",
          "Phục vụ cả khách lẻ (B2C) và doanh nghiệp (B2B)",
          "Giao hàng toàn quốc, tư vấn nhanh chóng",
        ],
        ctaText: "Xem chi tiết",
        ctaLink: "/about",
        imageSide: "right",
      },
    },
    {
      id: "about-slide-default",
      type: "banner-slider",
      order: 3,
      visible: true,
      props: {
        source: "manual",
        autoplay: true,
        interval: 5000,
        slides: [
          {
            image: "",
            title: "Sản phẩm đa dạng",
            caption:
              "Nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam — một điểm mua sắm cho cả nhu cầu cá nhân và doanh nghiệp.",
          },
          {
            image: "",
            title: "Phục vụ tận tâm",
            caption: "Đội ngũ VHD Corp luôn sẵn sàng tư vấn, báo giá và giúp bạn chọn đúng sản phẩm.",
          },
          {
            image: "",
            title: "Giao hàng toàn quốc",
            caption: "Hàng được đóng gói cẩn thận và giao đến tận nơi trên khắp cả nước.",
          },
        ],
      },
    },
    {
      id: "featured-default",
      type: "featured-products",
      order: 4,
      visible: true,
      props: { heading: "Sản phẩm nổi bật", limit: 8, layout: "grid" },
    },
    {
      id: "testimonials-default",
      type: "testimonials",
      order: 5,
      visible: true,
      props: {
        autoplay: true,
        quotes: [
          {
            name: "Nguyễn Văn Thắng",
            role: "Khách hàng doanh nghiệp",
            quote:
              "Sản phẩm đúng như mô tả, giao hàng nhanh và đội ngũ tư vấn nhiệt tình. Chúng tôi sẽ tiếp tục hợp tác lâu dài.",
          },
          {
            name: "Trần Thị Hương",
            role: "Khách hàng doanh nghiệp",
            quote: "Đặt hàng dễ dàng, được tư vấn kỹ trước khi mua. Chất lượng ổn định qua nhiều lần đặt.",
          },
          {
            name: "Phạm Đức Minh",
            role: "Khách hàng cá nhân",
            quote: "Giá hợp lý, hàng đóng gói cẩn thận. Mình rất hài lòng với dịch vụ của VHD.",
          },
        ],
      },
    },
    {
      id: "faq-default",
      type: "faq-accordion",
      order: 6,
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
      order: 7,
      visible: true,
      props: { heading: "Tin tức & Cập nhật", limit: 4, layout: "grid" },
    },
    {
      id: "cta-default",
      type: "contact-cta",
      order: 8,
      visible: true,
      props: {
        heading: "Cần tư vấn hoặc báo giá?",
        body: "Liên hệ với VHD Corp — chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.",
        ctaText: "Liên hệ ngay",
        ctaLink: "/contact",
      },
    },
  ];
}

/**
 * Sections mặc định cho trang Giới thiệu — nội dung trung thực, không phóng đại:
 * giới thiệu, chúng tôi làm gì, sứ mệnh/tầm nhìn/giá trị, giá trị cốt lõi, liên hệ.
 * Admin chỉnh qua Builder; khi publish có section → client render PageRenderer.
 */
export function defaultAboutSections(): Section[] {
  return [
    {
      id: "about-hero-default",
      type: "hero",
      order: 1,
      visible: true,
      props: {
        heading: "Về *VHD Corp*",
        subheading:
          "VHD Corp là đơn vị phân phối sản phẩm nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam. Chúng tôi kết nối nhà sản xuất trong nước với khách hàng cá nhân và doanh nghiệp trên toàn quốc.",
        ctaText: "Liên hệ với chúng tôi",
        ctaLink: "/contact",
        align: "left",
        minHeight: 480,
        animation: "fade-up",
      },
    },
    {
      id: "about-what-default",
      type: "feature-showcase",
      order: 2,
      visible: true,
      props: {
        eyebrow: "Chúng tôi làm gì",
        heading: "Đưa sản phẩm Việt đến tay khách hàng",
        subheading:
          "Từ khâu tuyển chọn nhà cung cấp đến khi giao hàng tận nơi, VHD Corp đồng hành để bạn mua đúng sản phẩm với trải nghiệm thuận tiện.",
        bullets: [
          "Tuyển chọn sản phẩm từ nhà sản xuất trong nước",
          "Tư vấn giúp bạn chọn đúng sản phẩm và số lượng",
          "Đóng gói cẩn thận, giao hàng toàn quốc",
          "Hỗ trợ trước và sau khi mua hàng",
        ],
        ctaText: "Xem sản phẩm",
        ctaLink: "/products",
        imageSide: "left",
      },
    },
    {
      id: "about-slide-default",
      type: "banner-slider",
      order: 3,
      visible: true,
      props: {
        source: "manual",
        autoplay: true,
        interval: 5000,
        slides: [
          {
            image: "",
            title: "Sản phẩm đa dạng",
            caption:
              "Nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam — một điểm mua sắm cho cả nhu cầu cá nhân và doanh nghiệp.",
          },
          {
            image: "",
            title: "Phục vụ tận tâm",
            caption: "Đội ngũ VHD Corp luôn sẵn sàng tư vấn, báo giá và giúp bạn chọn đúng sản phẩm.",
          },
          {
            image: "",
            title: "Giao hàng toàn quốc",
            caption: "Hàng được đóng gói cẩn thận và giao đến tận nơi trên khắp cả nước.",
          },
        ],
      },
    },
    {
      id: "about-pillars-default",
      type: "use-cases",
      order: 4,
      visible: true,
      props: {
        eyebrow: "Định hướng",
        heading: "Sứ mệnh – Tầm nhìn – Giá trị cốt lõi",
        columns: 3,
        cases: [
          {
            emoji: "🎯",
            title: "Sứ mệnh",
            description:
              "Kết nối các nhà sản xuất Việt Nam với khách hàng trên toàn quốc — sản phẩm chất lượng, giá hợp lý, dịch vụ tận tâm.",
          },
          {
            emoji: "👁️",
            title: "Tầm nhìn",
            description:
              "Trở thành địa chỉ phân phối đáng tin cậy về nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam.",
          },
          {
            emoji: "❤️",
            title: "Giá trị cốt lõi",
            description: "Chất lượng — Minh bạch — Hợp tác bền vững. Chúng tôi giữ đúng cam kết với từng khách hàng.",
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
        eyebrow: "Giá trị",
        heading: "Điều làm nên VHD Corp",
        columns: 4,
        cases: [
          {
            emoji: "🤝",
            title: "Hợp tác",
            description: "Đồng hành cùng nhà sản xuất và khách hàng để cùng phát triển lâu dài.",
          },
          {
            emoji: "🛡️",
            title: "Tin cậy",
            description: "Hàng đúng mô tả, rõ nguồn gốc — điều chúng tôi cam kết với mọi đơn hàng.",
          },
          {
            emoji: "💬",
            title: "Tận tâm",
            description: "Đội ngũ tư vấn sẵn sàng hỗ trợ, phản hồi nhanh trong giờ làm việc.",
          },
          {
            emoji: "✨",
            title: "Minh bạch",
            description: "Giá cả và thông tin sản phẩm rõ ràng, không phóng đại.",
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
        heading: "Cần tư vấn hay hợp tác?",
        body: "Liên hệ với VHD Corp — chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.",
        ctaText: "Liên hệ ngay",
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
            description: "Ký hợp đồng/xác nhận đơn — kho chuẩn bị hàng, kiểm tra chất lượng.",
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
              "Trong vòng 24 giờ làm việc kể từ khi nhận yêu cầu — đơn số lượng lớn có chuyên viên phụ trách riêng.",
          },
          {
            question: "VHD Corp làm việc khung giờ nào?",
            answer: "Thứ 2 – Thứ 7, 8:00 – 17:30. Ngoài giờ vẫn nhận yêu cầu qua form/email và trợ lý AI trên website.",
          },
          {
            question: "Có hỗ trợ xuất hóa đơn và hợp đồng B2B?",
            answer: "Có — đầy đủ hóa đơn và hợp đồng cho đối tác doanh nghiệp.",
          },
          {
            question: "Giao hàng những khu vực nào?",
            answer: "Toàn quốc — thời gian giao cụ thể sẽ được xác nhận khi bạn đặt hàng, tùy khu vực.",
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
          body: "Chiết khấu theo số lượng và hỗ trợ hóa đơn cho doanh nghiệp.",
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
        body: "Đội ngũ VHD sẵn sàng giải đáp mọi câu hỏi và báo giá.",
        ctaText: "Liên hệ chuyên gia",
        ctaLink: "/contact",
      },
    },
  ];
}
