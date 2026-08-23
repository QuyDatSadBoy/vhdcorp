# VHD Corp — Tổng quan hệ thống & Danh mục tính năng

> Đọc file này để hiểu **toàn bộ** hệ thống: kiến trúc, tính năng khách hàng, tính năng quản trị, và trợ lý AI.
> Chi tiết kỹ thuật từng đợt phát triển: [HANDOVER.md](HANDOVER.md) · Kiến trúc agent: [AGENT_PLAN.md](AGENT_PLAN.md) · Báo cáo bàn giao: [BAO_CAO.md](BAO_CAO.md) · Cách chạy: [../README.md](../README.md)

## 1. Kiến trúc tổng

```
┌─────────────┐   REST /api    ┌──────────────┐    SQL     ┌────────────────┐
│  fe/ Next.js │ ─────────────▶ │ be/ NestJS 11 │ ─────────▶ │ PostgreSQL 16  │
│  (cổng 3001) │               │  (cổng 8080)  │            │ (Docker)       │
└──────┬──────┘               └──────┬───────┘            └───────▲────────┘
       │ SSE /api/chat               │ webhook resync (~0.25s)     │ đọc trực tiếp
       ▼                             ▼                             │ (asyncpg, read-only)
┌──────────────────────────────────────────────────────┐          │
│ agent/ FastAPI + LangGraph + DeepAgents (cổng 8001)   │ ─────────┘
│ DeepSeek (chính) → 13 model dự phòng · 17 tool        │
│ SKILL · subagent · gen-UI · A2A · MCP · TTS · AG-UI   │
└──────────────────────────────────────────────────────┘
```

- **1 nguồn dữ liệu duy nhất** (PostgreSQL). Site config (giao diện) là JSONB — bản PUBLISHED cho khách, DRAFT cho builder.
- **Realtime không cache**: mọi fetch FE `cache: no-store`; admin bấm Xuất bản là khách thấy ngay; agent đọc thẳng DB.
- Auth: JWT trong **HttpOnly cookie** (signed), refresh token; role `CUSTOMER / STAFF / ADMIN` + cờ `isRoot`.

## 2. Tính năng phía KHÁCH (client)

### Mua sắm (kiểu Shopee, không thanh toán online)

| Tính năng                     | Mô tả                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Danh mục & sản phẩm           | Lọc theo danh mục, sắp xếp giá/tên/mới nhất, phân trang                                                                                                                                                                                     |
| **Giá khuyến mãi**            | Giá đỏ + giá gốc gạch ngang + badge `-x%` + "KM đến dd/mm" (admin đặt hạn)                                                                                                                                                                  |
| **Tìm kiếm gợi ý thông minh** | Ô search trên header: gõ (không dấu cũng khớp — unaccent) → dropdown sản phẩm kèm ảnh + giá, Enter ra trang kết quả đầy đủ (SP + bài viết)                                                                                                  |
| **Mua qua chat AI**           | Nói với trợ lý "thêm 2 cái này vào giỏ" — agent thêm vào giỏ thật, hiểu đang đứng ở trang sản phẩm nào                                                                                                                                      |
| **Giỏ hàng**                  | Thêm/sửa số lượng/xóa, lưu localStorage (giữ qua reload), badge số lượng trên header                                                                                                                                                        |
| **Voucher**                   | Nhập mã ở giỏ → kiểm tra hạn/số lượt/đơn tối thiểu, hiện mức giảm                                                                                                                                                                           |
| **Đặt hàng**                  | **Cần đăng nhập** (thêm giỏ thì không) — form tự điền từ hồ sơ (tên/email/SĐT/địa chỉ); đơn `VHD-xxxx`, **không thanh toán online** — mail về admin (`ADMIN_EMAIL` trong env) + mail xác nhận khách; giá/giảm giá tính lại 100% server-side |
| **Theo dõi đơn**              | Đăng nhập → "Đơn hàng của tôi" xem trạng thái (Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn tất/Hủy)                                                                                                                                       |
| **Đã xem gần đây**            | Dải 8 sản phẩm xem gần nhất (localStorage) ở trang chi tiết                                                                                                                                                                                 |
| **Gợi ý thông minh**          | "Sản phẩm liên quan" = co-view từ tracking thật ("khách xem X cũng xem Y", fallback cùng danh mục); "Có thể bạn cũng thích" trong giỏ hàng                                                                                                  |
| Đánh giá sản phẩm             | Khách đăng nhập chấm sao + bình luận                                                                                                                                                                                                        |

### Tài khoản

- Đăng ký cần **Gmail thật** (OTP 6 số), quên mật khẩu qua OTP, đăng nhập Google OAuth (tự xác minh).
- **Khuyến khích đăng nhập**: banner ở giỏ hàng (tự điền thông tin + theo dõi đơn), CTA đăng ký sau khi đặt đơn thành công.
- Trang tài khoản: hồ sơ (tên, avatar, **SĐT, địa chỉ giao hàng** — tự điền khi đặt đơn), đổi mật khẩu, đơn hàng của tôi.
- **Phiên admin và phiên khách độc lập** — mở 2 tab (1 admin, 1 khách) cùng trình duyệt không đè nhau (cookie scope riêng).

### Nội dung & liên hệ

- Tin tức/bài viết, trang giới thiệu, form liên hệ (SĐT bắt buộc) — mail về admin.
- Nút liên hệ nổi (Zalo/Messenger/hotline… admin tự cấu hình kênh + icon).
- Tracking ẩn danh: mở trang SP ≥2s → 1 lượt xem (dedupe 30 phút) → nguồn cho recommendation + báo cáo.

### Trợ lý AI (chat widget)

- Lần đầu vào web (desktop): panel **tự mở** kèm 6 câu hỏi mẫu; mobile hiện bong bóng chào.
- Chi tiết năng lực: mục 4.

## 3. Tính năng phía ADMIN (`/admin`)

| Menu                                             | Tính năng                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                                        | KPI (SP/bài viết/danh mục/khách hàng/**đơn chờ xác nhận**), chart tăng trưởng + lượt xem 30 ngày (tracking thật), top SP được xem, 4 nút CSV + báo cáo PDF                                                                                                                 |
| Sản phẩm                                         | CRUD + đa ảnh (Cloudinary) + mô tả rich-text + SEO + **giá khuyến mãi + hạn KM** + tồn kho + trạng thái                                                                                                                                                                    |
| Danh mục                                         | CRUD cây danh mục                                                                                                                                                                                                                                                          |
| Bài viết                                         | CRUD + rich-text + tags + SEO                                                                                                                                                                                                                                              |
| Banner                                           | CRUD banner theo vị trí (`home-hero`…) — hiển thị qua section "Banner slider" nguồn _Quản trị → Banner_                                                                                                                                                                    |
| Thư viện ảnh                                     | Upload/quản lý ảnh dùng chung                                                                                                                                                                                                                                              |
| **Đơn hàng**                                     | Danh sách + lọc theo trạng thái, chi tiết (items, giảm giá, ghi chú), **chuyển trạng thái** (khách thấy ở tài khoản)                                                                                                                                                       |
| **Voucher**                                      | CRUD: mã, giảm %/số tiền, đơn tối thiểu, số lượt tối đa, thời hạn, bật/tắt; trạng thái chạy/hết hạn/hết lượt                                                                                                                                                               |
| Đánh giá                                         | Duyệt/ẩn đánh giá                                                                                                                                                                                                                                                          |
| Liên hệ                                          | Hộp thư liên hệ, đánh dấu xử lý                                                                                                                                                                                                                                            |
| Người dùng                                       | CRUD + lọc vai trò, **gửi email hàng loạt** (template + soạn WYSIWYG + xem trước brand, biến `{{name}}/{{email}}`, tự sửa biến gõ hỏng), reset mật khẩu cấp dưới (không cần mật khẩu cũ), **root bất khả xâm phạm**                                                        |
| Page Builder                                     | Mục 5                                                                                                                                                                                                                                                                      |
| Cài đặt site                                     | Brand (logo/favicon/OG), theme (7 màu, font, cỡ chữ, spacing, radius), SEO (GA/GTM/Pixel), navigation, header promo, footer (mô tả, dải cam kết, bản đồ, fanpage, thông tin liên hệ + kênh nổi, social, cột link, copyright), custom CSS, **lịch sử phiên bản + rollback** |
| Kiến thức AI                                     | Sửa tài liệu công ty cho agent trả lời (giờ mở cửa, chính sách…)                                                                                                                                                                                                           |
| **Trợ lý AI** (`/admin/ai-assistant`)            | Chat với **trợ lý điều hành**: hỏi số liệu kho thật, nhờ soạn nháp sản phẩm/bài viết chuẩn SEO. Trợ lý KHÔNG tự ghi vào cơ sở dữ liệu — nó trả bản nháp, admin duyệt rồi mới tạo                                                                                           |
| **Kỹ năng & công cụ AI** (`/admin/agent-config`) | Thêm/sửa/bật-tắt **kỹ năng** (quy trình nghiệp vụ dạng văn bản) và khai báo **MCP server** để nạp thêm công cụ. Kỹ năng áp dụng ngay lượt chat kế tiếp; MCP server phải khởi động lại agent (giao diện báo rõ)                                                             |
| **Server** (`/admin/server`)                     | Xem trạng thái/RAM/CPU + log 3 service, restart từng service hoặc tất cả                                                                                                                                                                                                   |

**Phân quyền**: STAFF = quản lý nội dung/đơn hàng; ADMIN = tất cả + người dùng; **ROOT** (`vhdcorp.contact@gmail.com`) = không ai xóa/đổi role/reset mật khẩu được, kể cả ADMIN khác.

## 4. Trợ lý AI — kiến trúc & năng lực

> Chi tiết kỹ thuật đầy đủ (chuỗi model, middleware, biến môi trường): [AGENT_PLAN.md §12](AGENT_PLAN.md).

**Pipeline** (LangGraph): `guardrail` (chặn prompt-injection, giới hạn độ dài) → `context` (persona + kiến thức công ty + trang khách đang mở + tóm tắt hội thoại + facts về khách) → `agent` = **DeepAgents** (tự lo vòng lặp gọi model ⇄ gọi công cụ ⇄ giao việc cho subagent ⇄ đọc SKILL) → stream SSE về FE. Không còn node `tools` riêng ở graph ngoài.

**Model**: chính là **DeepSeek `deepseek-v4-flash-vision-exp`** (1M context, đọc được ảnh khách gửi). Nếu lỗi/hết quota thì tự chuyển sang **Gemini** (`gemini-3.1-flash-lite` → `gemini-3.6-flash`, mỗi model thử lần lượt 5 key), rồi **Groq** (`openai/gpt-oss-120b`, miễn phí) → **MiniMax-Text-01** → **OpenRouter** (`inclusionai/ling-3.0-flash:free`) — tổng **14 model** trong chuỗi. Việc chuyển model diễn ra ở **từng lần gọi model** (`ModelFallbackMiddleware`), không phải chạy lại cả lượt chat → khách không bao giờ thấy "AI die" và không bị lặp chữ đã stream.
_Lưu ý cấu hình:_ deep agent chỉ nhận `DEEP_AGENT_MAX_FALLBACKS` model đầu chuỗi (mặc định **6** = DeepSeek + 5 key flash-lite); muốn dùng tới Groq/MiniMax/OpenRouter phải tăng biến này.

**Chốt an toàn chi phí mỗi lượt trả lời**: tra cứu sản phẩm tối đa **5 lần**, tổng gọi công cụ **15 lần**, gọi model **12 vòng**. Vượt hạn thì agent vẫn trả lời bằng dữ liệu đã có (không báo lỗi cho khách).

**Kỹ năng (SKILL)**: quy trình nghiệp vụ viết dạng văn bản, agent chỉ đọc khi thấy cần → thêm nhiều cũng không làm chậm/đắt. Đang có **5 kỹ năng bán hàng** (báo giá sỉ, chốt đơn & giao hàng, khuôn mẫu & đúc nhựa, quy cách gioăng, tư vấn chất liệu cao su) + **3 kỹ năng cho trợ lý admin** (rà soát kho, soạn bài SEO, viết mô tả sản phẩm). Chủ website tự thêm/sửa ở **Quản trị → Kỹ năng & công cụ AI**; dev thêm bằng cách tạo file `agent/skills/<tên>/SKILL.md`.

**Subagent**: việc nặng được giao cho trợ lý con chạy riêng rồi trả về bản tóm tắt — `tra-cuu-san-pham` (so sánh từ 3 mặt hàng trở lên) và `tra-cuu-tai-lieu` (đối chiếu nhiều mục chính sách). Nhờ vậy dữ liệu thô không nằm lại trong hội thoại chính ở những lượt sau.

**An toàn**: bộ công cụ hệ thống của DeepAgents bị giới hạn **CHỈ ĐỌC** (`read_file`, `ls`, `glob`, `grep`) — đã bỏ hẳn ghi/xoá file và chạy lệnh, nên prompt-injection không có gì để lợi dụng. MCP server admin khai báo chỉ nhận `http(s)`, không nhận stdio.

**Dữ liệu: đọc TRỰC TIẾP PostgreSQL** (`CATALOG_DATABASE_URL`, pool asyncpg read-only) — giá (đã áp KM), tồn kho, bài viết, danh mục, gợi ý co-view, thông tin công ty từ config PUBLISHED. DB lỗi → tự fallback `data/products.json` (webhook BE đồng bộ ~0.25s) — chat không bao giờ vỡ.

**17 tools** (chưa tính tool hệ thống của DeepAgents: `write_todos`, `task`, `read_file`, `ls`, `glob`, `grep`, và tool từ MCP server admin thêm):

| Nhóm      | Tool                                                                                       | Việc                                                                        |
| --------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Tra cứu   | `search_products` / `get_product_detail`                                                   | Tìm/chi tiết SP fuzzy không dấu — giá KM chính xác                          |
|           | `search_posts`                                                                             | Tin tức → thẻ bài viết bấm được                                             |
|           | `list_categories`                                                                          | Danh mục + số SP → chip bấm được                                            |
|           | `get_recommendations`                                                                      | "Khách xem X cũng xem Y" (tracking thật) → carousel                         |
|           | `get_company_info`                                                                         | Địa chỉ/hotline/social chính thức từ config                                 |
|           | `search_knowledge` / `web_search`                                                          | Tài liệu công ty / tìm web                                                  |
|           | `get_current_time`                                                                         | Ngày/giờ thật để đối chiếu giờ mở cửa (không tự đoán)                       |
| Hành động | `send_contact_request` / `create_quote_request`                                            | Gửi liên hệ / yêu cầu báo giá vào hệ thống                                  |
|           | `add_to_cart`                                                                              | **Thêm vào giỏ hàng thật hộ khách** (idempotent, thẻ xác nhận + nút mở giỏ) |
| Gen-UI    | `show_product_carousel` `show_contact_form` `show_quote_form` `show_comparison` `show_faq` | Model chủ động render giao diện trong chat                                  |

**Gen-UI** (giao thức AG-UI-style tự viết — SSE event `ui {component, props}` → registry React): product-carousel (kèm giá gạch khi KM), post-list, category-list, contact-form, quote-request, comparison-table, faq, image-search-result. Form gen-UI submit → gửi ngược lại agent (human-in-the-loop). Reload trang **giữ nguyên** UI đã render.

**Agentic UX**: agent biết **trang khách đang mở** (hiểu "sản phẩm này"); **bảng việc cần làm** hiện ngay trong chat khi yêu cầu nhiều bước (SSE event `todo` từ `write_todos`) kèm **log tiến trình** từng công cụ (`tool.start`/`tool.end` có kèm dữ liệu vào/ra rút gọn ≤600 ký tự); **follow-up chips** gợi ý câu hỏi tiếp theo; lần đầu vào web panel tự mở + câu hỏi mẫu.

**Cache câu hỏi lặp** (miễn phí, không dùng embedding): câu hỏi **giống hệt** (sau chuẩn hoá NFC) trên **cùng khu vực trang** thì trả lời ngay từ cache, dùng chung cho mọi khách. Chỉ cache câu KHÔNG dùng công cụ động (giá/tồn/gợi ý/thời gian) và không có gen-UI → không bao giờ phục vụ số liệu cũ. Tự hết hiệu lực khi sửa Kiến thức AI, TTL 14 ngày; xoá tay được từ trang quản trị.

**Chuẩn mở**: **A2A** (`/.well-known/agent-card.json`), **MCP server** (`/mcp`), và **AG-UI** (`/agui/chat`) — endpoint chuẩn để CopilotKit hoặc client AG-UI khác cắm vào; chạy **song song** với `/api/chat` chứ không thay thế (AG-UI không đi qua cache + chống spam nên chỉ dùng nội bộ). Trang demo headless: `/copilot-demo`.

**Khác**: voice input (Web Speech) + TTS đọc câu trả lời (`POST /api/tts`: **MiniMax chính → PTIT holobox dự phòng**, cache 2 lớp server + client), tìm sản phẩm bằng ảnh (vision của model chính), memory dài hạn theo khách, đọc Gmail (endpoint admin, secret), guardrail chống lộ system prompt, chống spam theo IP + trần chi phí/ngày.

**Kiểm thử**: `cd agent && rtk pytest` — **113 test**; `python3 scripts/e2e-agent.py` — **20 phép thử qua HTTP thật** (chạy được cả với `--url https://vhdcorp.com/agent`).

## 5. Page Builder — WYSIWYG toàn site

- **Preview = client 100%**: cùng component, cùng config (store đồng bộ), render cả Header/Footer thật; sửa gì thấy ngay; Lưu nháp / Xuất bản (realtime) / Undo-Redo / responsive 3 cỡ màn / Xem trước tab riêng.
- 5 trang: Trang chủ, Giới thiệu, Liên hệ, Sản phẩm, Tin tức. **21 loại section** kéo-thả (hero, đối tác, FAQ, so sánh, banner slider, video/map/social nhúng, HTML tùy chỉnh…). 0 section → client + preview cùng render layout mẫu (một nguồn `default-sections.ts`).
- **Khối cố định** (form liên hệ, danh sách SP/bài viết): có hàng riêng trong danh sách + click chọn ngay trong preview → sửa eyebrow/tiêu đề/mô tả.
- **Toàn site**: Header (promo) + Footer (mô tả, bản đồ, fanpage…) chỉnh ngay trong builder.
- Mọi thuộc tính hiển thị đều sửa được; mọi key ảnh (image/logo/icon/cover…) có nút tải ảnh lên Cloudinary.

## 6. Email (Gmail SMTP)

Template brand thống nhất (logo + màu + địa chỉ công ty): OTP đăng ký/quên mật khẩu, thông báo + xác nhận liên hệ, **thông báo + xác nhận đơn hàng** (bảng sản phẩm, giảm giá, tổng tiền; Reply-To = khách), email hàng loạt. Chống spam: plain-text song song, List-Unsubscribe, logo, địa chỉ vật lý. _Gửi số lượng lớn triệt để cần domain riêng + SPF/DKIM/DMARC._

## 7. Bảo mật & vận hành

- Validate 3 lớp lỗi **100% tiếng Việt**; throttle các endpoint public (đặt hàng 5/phút, voucher 20/phút…).
- Đơn hàng: giá + voucher tính lại server-side từ DB, voucher trừ lượt atomic trong transaction, kiểm tồn kho.
- Soft-delete User/Product/Post; root được bảo vệ ở tầng service.
- Nghiệm thu: `bash scripts/round-full.sh` (FE routes + API + email thật + agent + đồng bộ) — PASS khi `ROUND_RESULT=0`.
