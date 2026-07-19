# Tài liệu SEO — vhdcorp.com

> Mục tiêu: search **"vhd corp"**, **"vhd"**, **"vhdcorp"** hoặc **tên sản phẩm chủ đạo**
> (gioăng đai treo, gioăng bích, tấm cao su, ống đồng, gas lạnh, khuôn mẫu đúc nhựa…)
> → vhdcorp.com xuất hiện đầu tiên — trên cả **Google** và **AI search** (ChatGPT/Gemini/Perplexity).

## 1. Bộ từ khoá mục tiêu

| Nhóm            | Từ khoá                                                                                   | Trang đích                          |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| Thương hiệu     | vhd corp, vhdcorp, vhd, vhdcorp.com                                                       | Trang chủ                           |
| Ngành           | kho tổng vật tư điện lạnh, vật tư cơ điện M&E, bán sỉ vật tư điện lạnh                    | Trang chủ, /products                |
| Sản phẩm cao su | gioăng cao su, gioăng đai treo, gioăng bích, gioăng mặt bích, tấm cao su, cao su kỹ thuật | Trang sản phẩm + bài blog tương ứng |
| Vật tư lạnh     | gas lạnh, ống đồng, xốp bảo ôn, băng dính điện lạnh                                       | Trang sản phẩm + bài blog           |
| Sản xuất        | khuôn mẫu, đúc nhựa, khuôn mẫu cơ khí                                                     | Trang sản phẩm + bài blog           |

**Nguyên tắc**: mỗi từ khoá sản phẩm có **2 trang đích**: (1) trang sản phẩm, (2) một bài blog
chuyên sâu link về sản phẩm — Google xếp hạng bài chuyên sâu tốt hơn trang bán.

## 2. Hiện trạng kỹ thuật (đã đạt — không phá vỡ)

- **Title trang chủ** giàu từ khoá: `VHD Corp – Vật tư điện lạnh, gioăng cao su, khuôn mẫu đúc nhựa`
  (đặt tại Admin → Cài đặt site → SEO `defaultTitle`; ≤ 65 ký tự).
- **Meta description** (≤160 ký tự) + **meta keywords** phủ đủ bộ từ khoá — config `seo.defaultDescription`, `seo.defaultKeywords`.
- **H1 duy nhất** mỗi trang; H1 trang chủ = heading hero (sửa trong Page Builder) — PHẢI chứa từ khoá ngành,
  không dùng khẩu hiệu chung chung ("chuyên nghiệp", "uy tín"… không ai search).
- **Canonical tuyệt đối** mỗi trang; trang con dùng template `%s | VHD Corp`.
- **Dữ liệu cấu trúc (JSON-LD)**:
  - Trang chủ: `Organization`+`Store` (kèm `knowsAbout` = bộ từ khoá, `alternateName` gồm "vhdcorp", "VHD"),
    `WebSite` + SearchAction, `LocalBusiness`, `FAQPage` (6 hỏi-đáp).
  - Sản phẩm: `Product` (brand VHD Corp, offers + seller khi có giá, aggregateRating) + `BreadcrumbList`.
  - Bài viết: `Article` (publisher + logo) + `BreadcrumbList`.
- **Sitemap** động `/sitemap.xml` (mọi sản phẩm/bài/danh mục PUBLISHED, có lastModified). **Robots** cho phép
  toàn bộ trừ /admin, /account, /api…
- **AI SEO**: Cloudflare **đã tắt** "Managed robots.txt" → GPTBot/ClaudeBot/Google-Extended được crawl.
  KHÔNG bật lại toggle đó.
- **Google Search Console**: đã verify (mã dán ở Admin → Cài đặt site). Vị trí trung bình từ khoá thương hiệu ≈ 1.3.

## 3. Quy tắc on-page khi tạo nội dung mới (admin làm theo)

**Sản phẩm mới:**

1. Tên sản phẩm = đúng tên khách hay search (vd "Gioăng cao su đai treo" — không viết tắt).
2. Mô tả ≥ 150 từ, chứa từ khoá + biến thể (quy cách, chất liệu, ứng dụng). Dùng nút **AI viết mô tả**.
3. Điền **Meta Title** (≤65 ký tự, dạng `Tên sản phẩm – công dụng | VHD Corp`) + **Meta Description** (≤160).
4. Ảnh thật, rõ nét; hệ thống tự tối ưu qua Cloudinary.
5. Nếu là hàng chủ lực → tick **Bán chạy nhất** (lên đầu trang chủ + tag đỏ).

**Bài viết mới:**

1. Tiêu đề chứa từ khoá chính ở ĐẦU câu (vd "Gioăng bích cao su: …").
2. Có tóm tắt (excerpt), ảnh bìa, tags = từ khoá liên quan.
3. Trong bài LUÔN link về ≥1 trang sản phẩm + trang /contact (internal link).
4. Bài quan trọng → tick **Bài viết nổi bật** (lên đầu + tag vàng).

## 4. SEO cho AI search (GEO — Generative Engine Optimization)

- Nội dung phải **trả lời trực tiếp câu hỏi** (bài dạng "X là gì / cách chọn X") — AI trích đoạn đầu bài.
- `FAQPage` schema là nguồn AI hay trích nhất → cập nhật FAQ trong Builder khi có câu hỏi khách hay hỏi.
- `knowsAbout` + `sameAs` (Facebook, Zalo) trong Organization schema giúp AI gắn thương hiệu ↔ ngành hàng.
- Không chặn bot AI trong Cloudflare/robots.

## 5. Hiệu năng = SEO (Core Web Vitals)

Ngân sách bắt buộc (Google dùng làm tín hiệu xếp hạng):

- **LCP ≤ 2.5s** — ảnh hero dùng `next/image` `priority`; mọi ảnh khác lazy.
- **INP ≤ 200ms**, **CLS ≤ 0.1** — ảnh luôn có khung tỉ lệ sẵn.
- Quy tắc đã rút ra từ dự án (KHÔNG tái phạm):
  - ❌ Không `backdrop-filter`/`filter: blur` có animation (giật GPU, máy đo không thấy).
  - ❌ Không vòng lặp JS mỗi frame (`useAnimationFrame`, rAF marquee…) — dùng CSS animation.
  - ❌ Không WebGL/video nền/thư viện hiệu ứng nặng (three.js, lenis, gsap đã gỡ).
  - ✅ Hiệu ứng = CSS transform/opacity; scroll-effect = CSS `animation-timeline`.
  - ✅ Ngày giờ render phải kèm `timeZone: "Asia/Ho_Chi_Minh"` (tránh lỗi hydration).

## 6. Vận hành định kỳ

| Việc                   | Tần suất                   | Cách làm                                     |
| ---------------------- | -------------------------- | -------------------------------------------- |
| Gửi lại sitemap        | Khi thêm nhiều trang       | GSC → Sơ đồ trang web → gửi `sitemap.xml`    |
| Yêu cầu index bài mới  | Mỗi bài quan trọng         | GSC → Kiểm tra URL → "Yêu cầu lập chỉ mục"   |
| Xem từ khoá đang lên   | Hàng tuần                  | GSC → Hiệu suất → Cụm từ tìm kiếm            |
| Viết bài blog sản phẩm | ≥2 bài/tháng               | Dùng **AI soạn bài** trong admin, theo mục 3 |
| Kiểm tra tốc độ        | Sau mỗi thay đổi giao diện | PageSpeed Insights ≥ 90 mobile               |

## 7. Những gì KHÔNG được làm

- Không đổi domain/slug sản phẩm đã index (mất hạng). Đổi tên → giữ slug cũ.
- Không copy mô tả từ web khác (duplicate content).
- Không nhồi từ khoá vô nghĩa — mỗi trang 1 từ khoá chính + 2-3 biến thể.
- Không bật lại chặn bot AI trong Cloudflare.
- Không thêm hiệu ứng nặng vi phạm mục 5.
