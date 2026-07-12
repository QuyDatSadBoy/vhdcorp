# BÁO CÁO BÀN GIAO — VHD Corp

> Cập nhật: 2026-07-10. Website thương hiệu B2B/B2C (nhựa PVC/HDPE, cao su kỹ thuật, đặc sản làng nghề) + trợ lý AI.
> Tài liệu chi tiết: [HANDOVER.md](HANDOVER.md) (vận hành, checklist) · [AGENT_PLAN.md](AGENT_PLAN.md) (kiến trúc agent) · [README.md](../README.md) (khởi động).

## 1. Kiến trúc hệ thống

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  FE — Next.js 16 (:3001)    │ REST │  BE — NestJS 11 (:8080/api)  │
│  Client + Admin (1 app)     │─────▶│  Prisma 7 → PostgreSQL       │
│  React 19 · Tailwind v4     │      │  JWT HttpOnly · Cloudinary   │
│  shadcn/ui · Zustand ·      │      │  nodemailer (Gmail SMTP)     │
│  TanStack Query · Lenis ·   │      └──────┬───────────▲───────────┘
│  Framer Motion · R3F (3D)   │   webhook   │           │ proxy knowledge
│         │ SSE chat          │   resync    │           │ (JWT admin)
│         ▼                   │   (0.25s)   ▼           │
│  ┌──────────────────────────┴──────────────────────────┐
│  │  AGENT — FastAPI + LangGraph (:8001) · Gemini 3 Flash │
│  │  SQLite (hội thoại + checkpoint) · products.json      │
│  │  MiniMax TTS · Tavily search · Gmail IMAP · LangSmith │
│  │  A2A (/.well-known/agent-card.json) · MCP (/mcp)      │
│  └───────────────────────────────────────────────────────┘
```

| Thành phần         | Công nghệ                                                                                                       | Cổng          | Chạy                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------- |
| **Client + Admin** | Next.js 16, React 19, Tailwind v4, shadcn/ui, Zustand, TanStack Query, Framer Motion, GSAP, Lenis, three.js/R3F | 3001          | `cd fe && PORT=3001 yarn dev` |
| **Backend API**    | NestJS 11, Prisma 7, PostgreSQL, Passport JWT, nodemailer, Cloudinary                                           | 8080 (`/api`) | `cd be && yarn start:dev`     |
| **AI Agent**       | Python 3.13, FastAPI, LangGraph ≥1.0, Gemini 3 Flash, uv                                                        | 8001          | `cd agent && ./run.sh`        |

**Tài khoản admin mặc định** (tự tạo khi `yarn prisma:seed`): `admin@vhdcorp.com` / `admin123` — đổi mật khẩu khi bàn giao.

### Luồng dữ liệu chính

- **Client → BE**: REST `/api/*`; JWT nằm trong **HttpOnly cookie** (không localStorage), refresh chủ động mỗi 10 phút.
- **Admin sửa sản phẩm/danh mục → BE bắn webhook** `POST /api/admin/resync-products` sang agent → catalog chat cập nhật trong **~0.25s** (+ agent tự đồng bộ 30s/lần làm lưới an toàn) — dữ liệu chat **real-time 100% từ DB**.
- **Chat**: FE mở SSE `POST /api/chat` (agent) — events `conversation / message.delta / tool.start / tool.end / ui / done / error`; định danh khách bằng UUID trong localStorage (header `X-Chat-User`).
- **Admin sửa Kiến thức AI**: FE → BE proxy `/api/agent/knowledge` (JWT) → agent ghi `knowledge.md` + nạp lại ngay (secret chỉ nằm ở BE).
- **SiteConfig JSONB**: draft → publish → history/rollback; giá trị publish điều khiển toàn bộ giao diện client.

### Mô hình dữ liệu (PostgreSQL / Prisma)

`User` (role ADMIN/STAFF/CUSTOMER, soft-delete) · `Product` (slug, giá, tồn kho, ảnh[], SEO fields, soft-delete) · `Category` (cây cha–con, SEO) · `Post` (Tiptap HTML, tags, SEO) · `Banner` · `Media` (Cloudinary publicId) · `Review` (duyệt/ẩn) · `Contact` (hộp thư) · `SiteConfig` (JSONB + `SiteConfigHistory`) · `Statistics` (lượt xem).
Phía agent: SQLite `chat.db` (conversations / messages **kèm ui_blocks** / memory) + `checkpoints.db` (LangGraph state).

## 2. Tính năng phía khách (client)

- **Trang**: `/` (trang chủ build từ section động), `/products` (+ filter danh mục, sort, infinite scroll), `/products/[slug]` (gallery, thông số, đánh giá, sản phẩm liên quan), `/categories/[slug]`, `/posts`, `/posts/[slug]`, `/about`, `/contact` (form RHF+Zod), `/search` (full-text, noindex), `/login`, `/register` (+ Google OAuth), `/account/*`.
- **Thiết kế theo logo VHD**: xanh royal `#1B3A8C`, vàng gold `#F5A623`, đỏ `#C8102E`; hero 3D (three.js), hiệu ứng cuộn GSAP + Lenis smooth-scroll, light/dark mode, responsive 4 cỡ màn.
- **SEO**: SSR danh sách (link crawlable), JSON-LD (Product/Article/LocalBusiness/Breadcrumb), title template `%s | VHD Corp`, sitemap/robots tự sinh, OG image 1200×630 từ logo, canonical.
- **Widget nổi góc phải**: nút chat AI + nút liên hệ nhanh (kênh do admin cấu hình) + back-to-top + thanh CTA sticky.

## 3. Tính năng phía admin — tùy biến 100%

Đăng nhập `/admin/login` (chỉ email/mật khẩu). Mọi thứ khách nhìn thấy đều chỉnh được từ admin:

| Khu vực                                     | Tùy chỉnh được                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cài đặt site → Brand**                    | Logo, favicon, OG image (tải lên Cloudinary), tên site, tagline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **→ Theme**                                 | 7 màu thương hiệu, font Google (heading/body), cỡ chữ gốc, spacing, bo góc — áp toàn site qua CSS variables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **→ SEO**                                   | Title template, mô tả, keywords, GA/GTM/Facebook Pixel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **→ Header / Navigation**                   | Promo strip, menu đa cấp (thêm/xóa/sắp xếp)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **→ Footer**                                | Cột link, mô tả, social, bản đồ, thông tin liên hệ, **kênh nút liên hệ nổi**: thêm không giới hạn kênh (Facebook/Zalo/TikTok/YouTube/Instagram/LinkedIn/Telegram/WhatsApp/SĐT/email/link) — chọn icon preset màu thương hiệu **hoặc tải icon riêng lên**, nhãn + link tùy ý, sắp xếp thứ tự; SĐT tự thành `tel:`, email tự thành `mailto:`                                                                                                                                                                                                                                                                                                                                                                    |
| **→ Custom CSS**                            | CSS tự do inject vào site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **→ Lịch sử**                               | Xem/khôi phục mọi phiên bản cấu hình (draft → publish → rollback)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Page Builder** (`/admin/builder`)         | **Phủ 100% trang nội dung — 5 trang**: Trang chủ (13 section), Giới thiệu (6), Liên hệ (2), Sản phẩm & Tin tức (section nằm trên danh sách — banner/CTA). Mở lên là thấy ngay giao diện đang chạy. **Click khối ↔ preview cuộn tới + highlight 2 chiều** (chọn từ list hoặc click thẳng vào preview kiểu Wix). **Kéo-thả** sắp xếp, 17 loại section, thêm/xóa/ẩn/**nhân bản**; **panel thuộc tính dạng form tiếng Việt** (danh sách chỉ số/bước/FAQ… có nút thêm/xóa/sắp xếp — không phải gõ JSON), tải ảnh Cloudinary ngay trong panel; undo/redo (Ctrl+Z/Y), **chỉ Lưu thủ công** (không auto-save), live preview 3 cỡ màn + Xem trước bản nháp. **Xuất bản là khách thấy NGAY** (site không cache dữ liệu) |
| **Sản phẩm / Danh mục / Bài viết / Banner** | CRUD đầy đủ, rich editor Tiptap, nhiều ảnh, SEO override từng trang, soft-delete + khôi phục                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Thư viện ảnh**                            | Upload kéo-thả lên Cloudinary, xóa là gỡ cả trên cloud                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Người dùng**                              | **CRUD đầy đủ**: tạo tài khoản (email/mật khẩu/vai trò), sửa tên, đổi vai trò ADMIN/STAFF/CUSTOMER, **đặt lại mật khẩu**, xóa mềm + **Thùng rác khôi phục**, tìm theo email                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Đánh giá / Liên hệ**                      | Duyệt-ẩn review, hộp thư liên hệ khách                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Kiến thức AI** (`/admin/knowledge`)       | Soạn thông tin công ty cho trợ lý bằng **Tiptap WYSIWYG** hoặc Markdown thô — **Lưu là trợ lý dùng ngay**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Dashboard**                               | KPI + biểu đồ lượt xem/top sản phẩm (recharts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## 4. Trợ lý AI (điểm nhấn)

- **Kiến trúc LangGraph**: guardrail (chặn prompt-injection/spam) → context (nhồi knowledge + catalog + memory) → agent ⇄ tools; checkpoint SQLite; LangSmith tracing.
- **Gen-UI trong chat** (kiểu CopilotKit): carousel sản phẩm, form liên hệ, form báo giá, bảng so sánh, FAQ accordion, kết quả tìm bằng ảnh — render inline, submit human-in-the-loop, **reload trang vẫn giữ nguyên** (persist `ui_blocks` SQLite).
- **Dữ liệu real-time 100%**: giá/tồn kho từ DB qua webhook 0.25s; thông tin công ty từ Kiến thức AI (admin sửa là áp ngay).
- **Voice 2 chiều**: nói-thành-chữ (Web Speech vi-VN) + đọc-to câu trả lời (MiniMax TTS, cache 2 lớp: server LRU + client — nghe lại ~60ms).
- **Tìm sản phẩm bằng ảnh** (Gemini vision): đính ảnh bất kỳ (tự thu nhỏ về 1280px nên ảnh chụp điện thoại 8–15MB vẫn gửi ngay).
- **Tools**: tra catalog (fuzzy tiếng Việt không dấu), tra knowledge, tìm web (Tavily, xoay vòng 13 key), **chủ động gửi liên hệ** vào BE (khách nhận email xác nhận).
- **Quản lý hội thoại kiểu ChatGPT**: danh sách/lịch sử/đổi tên/xóa; chỉ tạo khi gửi tin đầu; memory = 8 tin gần nhất + tóm tắt nền + facts dài hạn (task nền).
- **UX widget**: streaming từng chữ, nút dừng/thử lại, con lăn chuột **chỉ cuộn trong khung chat** (không kéo trang phía sau), mobile full-screen.
- **Chuẩn mở**: **A2A** (agent-card + JSON-RPC `message/send`), **MCP** server tại `/mcp` (publish catalog cho agent khác), **đọc Gmail** IMAP (endpoint admin).

## 5. Email (Gmail SMTP thật)

Khách gửi form (hoặc nhờ AI) → lưu DB + email cho admin + email xác nhận cho khách — template HTML brand, plain-text kèm theo, header chống spam (Reply-To, List-Unsubscribe, Message-ID). Đổi tài khoản gửi: `SMTP_USER/SMTP_PASS/MAIL_FROM/ADMIN_EMAIL` trong `be/.env`.

## 6. Bảo mật

JWT trong HttpOnly cookie + refresh; guards role ADMIN/STAFF trên mọi route quản trị; throttling; sanitize HTML đầu vào rich-text; soft-delete; secrets của agent (resync/knowledge/Gmail) chỉ nằm server-side; guardrail chat chặn prompt-injection; `/admin` chặn index (robots).

## 7. Kiểm thử

- **Agent**: 57 pytest PASS. **FE/BE**: production build PASS, `tsc` + ESLint sạch.
- **3 vòng E2E liên tiếp PASS 100%** (`round-full.sh`): 17 route FE + 6 API BE + SEO + security + gửi email thật + agent (giá/ngữ cảnh/gen-UI/knowledge/guardrail/TTS/A2A/Gmail) + đồng bộ products.json = DB.
- Browser thật (Playwright, desktop 1854 + mobile 390, light/dark): reload giữ gen-UI, upload ảnh chat end-to-end, con lăn chỉ cuộn khung chat, admin thêm kênh + tải icon → publish → client hiển thị đúng, console **0 lỗi**.

## 8. Lưu ý vận hành / việc còn lại cho khách

- **KHÔNG tạo `yarn.lock` ở repo root** (vỡ resolve Tailwind — xem README).
- Điền nội dung thật vào **Admin → Kiến thức AI** (đang là mẫu) và thay link thật cho 3 kênh liên hệ nổi mẫu (Facebook/Zalo/TikTok).
- Upload ảnh sản phẩm thật qua Admin → Thư viện ảnh (đang dùng placeholder brand).
- Đổi khi lên production: mật khẩu admin, JWT/COOKIE secrets, `REVALIDATE_SECRET`, `X-Admin-Secret`/`X-Resync-Secret`, hộp Gmail (`GMAIL_IMAP_*`, `SMTP_*`).
