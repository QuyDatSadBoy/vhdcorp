import type { Section } from "@/types/site-config";

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
        logos: [],
        grayscale: true,
        speed: 30,
      },
    },
  ];
}
