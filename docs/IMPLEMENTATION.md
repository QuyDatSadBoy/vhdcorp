# IMPLEMENTATION — VHD Corp

> Tài liệu theo dõi tiến độ thực thi dự án theo plan đã chốt. Mỗi phase có deliverable độc lập, test xong mới sang phase kế.

---

## 1. Tổng quan plan (8 phases)

| # | Phase | Mục tiêu | Trạng thái |
| --- | --- | --- | --- |
| 0 | Foundation Cleanup | Đồng bộ deps/config/schema/theme nền tảng | ⏳ Đang thực thi |
| 1 | Backend Authentication | Email/password + Google OAuth + refresh rotation + HttpOnly Cookie | ⏸ Pending |
| 2 | Backend Domain Modules | 8 module CRUD (user, category, product, post, review, banner, media, site-config) + soft delete | ⏸ Pending |
| 3 | Frontend Foundation | Services/hooks/store/middleware/theme runtime đầy đủ | ⏸ Pending |
| 4 | Client UI (public) | 12 routes Apple-style + animation phong phú + 3D + SEO metadata | ⏸ Pending |
| 5 | Admin UI | Genesis editorial style, datatable, form, Tiptap, Cloudinary upload | ⏸ Pending |
| 6 | Visual Page Builder | 3-panel DnD, theme realtime, preview, draft/publish + history | ⏸ Pending |
| 7 | SEO + Polish + Testing | Sitemap, robots, JSON-LD, OG dynamic, A11y, Lighthouse pass | ⏸ Pending |

---

## 2. Quyết định kiến trúc đã chốt với user

- **Order**: Tuần tự Phase 0 → 7. Không nhảy phase.
- **Auth**: Rewrite hoàn toàn theo PRD — xóa flow Google idToken cũ. HttpOnly access (15m) + refresh (7d) cookie, refresh rotation, bcrypt hash refresh trong DB.
- **Database**: Drop & migrate fresh. Không preserve data cũ.
- **Credentials**: User có sẵn Google OAuth + Cloudinary → điền vào `be/.env` ở Phase 0.
- **Package manager**: `yarn` (KHÔNG dùng npm/pnpm/bun).
- **Pre-commit hook**: husky + lint-staged ở root (xem section 5).

---

## 3. Phase 0 — Foundation Cleanup ✅ HOÀN THÀNH

### 3.1. Files đã tạo / sửa

| File | Hành động | Ghi chú |
| --- | --- | --- |
| [be/.env.example](../be/.env.example) | Rewrite | Thêm `FRONTEND_URL`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES=15m`, `JWT_REFRESH_EXPIRES=7d`, `COOKIE_DOMAIN`, `GOOGLE_CALLBACK_URL`, `CLOUDINARY_*` (4 vars) |
| [be/.env](../be/.env) | Update | DB đổi tên `vhdcorp_dev`, JWT secrets dev, cookie secret. Để trống Google + Cloudinary để user điền. |
| [fe/.env.example](../fe/.env.example) | Update | Thêm `NEXT_PUBLIC_CLOUDINARY_*` |
| [fe/.env.local](../fe/.env.local) | Update | Tương tự, để trống Cloudinary cho user điền |
| [be/prisma/schema.prisma](../be/prisma/schema.prisma) | Rewrite hoàn toàn | 9 models + 5 enums + indexes + `@@map` snake_case theo `docs/DATABASE.md`. Bỏ `url` (Prisma 7 dùng `prisma.config.ts`) |
| [be/prisma/seed.ts](../be/prisma/seed.ts) | Mới | Seed admin (`admin@vhdcorp.vn` / `admin123`), 4 categories root, 8 sample products, 3 sample posts, default SiteConfig JSONB |
| [be/src/main.ts](../be/src/main.ts) | Rewrite | CORS đọc `FRONTEND_URL` (không `*`), `trust proxy` cho production, port từ env, CSP cho Cloudinary, log thân thiện |
| [be/tsconfig.json](../be/tsconfig.json) | Update | Path alias `@prisma-client` → `prisma/generated/client` |
| [be/src/prisma/prisma.service.ts](../be/src/prisma/prisma.service.ts) | Rewrite | Import từ `@prisma-client`, log levels theo NODE_ENV |
| [be/src/providers/jwt.provider.ts](../be/src/providers/jwt.provider.ts) | Rewrite | Dùng `JWT_ACCESS_SECRET` + `JWT_ACCESS_EXPIRES`, register global JwtModule |
| [be/src/common/decorators/roles.decorator.ts](../be/src/common/decorators/roles.decorator.ts) | Mới | `@Roles(Role.ADMIN, Role.STAFF)` metadata decorator |
| [be/src/common/decorators/current-user.decorator.ts](../be/src/common/decorators/current-user.decorator.ts) | Mới | `@CurrentUser()` param decorator, type-safe `JwtPayload` |
| [be/src/common/decorators/public.decorator.ts](../be/src/common/decorators/public.decorator.ts) | Mới | `@Public()` để skip JwtAuthGuard global |
| [be/src/common/guards/roles.guard.ts](../be/src/common/guards/roles.guard.ts) | Mới | Kiểm `request.user.role` ∈ required, throw 403 nếu fail |
| [be/src/common/guards/jwt-auth.guard.ts](../be/src/common/guards/jwt-auth.guard.ts) | Rewrite | Đọc `req.signedCookies.access_token` (cookie HttpOnly), env `JWT_ACCESS_SECRET`, respect `@Public()` |
| [be/src/common/utils/cookies.ts](../be/src/common/utils/cookies.ts) | Mới | Helper `setAuthCookies` / `clearAuthCookies` với HttpOnly Secure SameSite=Strict signed, parse expires `15m`/`7d`/... |
| [be/src/authentication/](../be/src/authentication) | Rewrite full | service/controller/dto theo Phase 1 spec — register/login/admin-login/refresh/logout/me/google idToken |
| [be/src/models/user/](../be/src/models/user) | Rewrite | service + controller bảo vệ `@Roles(ADMIN, STAFF)` + soft delete (`deletedAt`) |
| [fe/types/site-config.ts](../fe/types/site-config.ts) | Mới | TypeScript schema đầy đủ Brand/Theme/Seo/PageSchema/10 Section types union/Navigation/Footer khớp PRD 4.7 |
| [fe/types/auth.ts](../fe/types/auth.ts) | Mới | `Role`, `AuthUser`, `LoginPayload`, `RegisterPayload` |
| [fe/lib/axios.ts](../fe/lib/axios.ts) | Rewrite | `withCredentials: true`, bỏ localStorage, 401 → single-flight `/auth/refresh` → retry 1 lần |
| [fe/lib/site-config.ts](../fe/lib/site-config.ts) | Mới | `getSiteConfig()` server-side fetch React `cache()` + `themeCssVars(theme)` |
| [fe/lib/seo.ts](../fe/lib/seo.ts) | Mới | `buildMetadata({title, description, image, canonical, type, noindex})` áp `seo.titleTemplate`, OG, Twitter, robots |
| [fe/store/auth.store.ts](../fe/store/auth.store.ts) | Rewrite | Chỉ `user`, `isAuthenticated`, `isHydrated`. Không lưu token |
| [fe/store/ui.store.ts](../fe/store/ui.store.ts) | Mới | `adminSidebarCollapsed`, persist `vhd-ui`; không lưu locale vì UI chỉ tiếng Việt |
| [fe/store/site-config.store.ts](../fe/store/site-config.store.ts) | Mới | Hydrate config server, `applyTheme()` set CSS vars runtime cho live preview builder |
| [fe/store/index.ts](../fe/store/index.ts) | Update | Export 3 stores |
| [fe/messages/vi.json](../fe/messages/vi.json) | Mới | Namespace `common`, `nav`, `home`, `products`, `posts`, `auth`, `account`, `admin`, `builder`; source UI string duy nhất |
| [fe/i18n/request.ts](../fe/i18n/request.ts) | Mới | next-intl single-locale — luôn dùng `vi`, không cookie locale, không toggle ngôn ngữ |
| [fe/middleware.ts](../fe/middleware.ts) | Mới | Protect `/account/*` + `/admin/*` (trừ `/admin/login`) — redirect `/login?next=` hoặc `/admin/login?next=` |
| [fe/next.config.ts](../fe/next.config.ts) | Update | Wrap `withNextIntl(...)`, thêm `images.remotePatterns` cho Cloudinary + Google avatar |
| [fe/app/layout.tsx](../fe/app/layout.tsx) | Rewrite | `lang="vi"`, font Be Vietnam Pro + Inter, fetch SiteConfig RSC inject CSS vars qua `<style>`, `suppressHydrationWarning` |
| [fe/app/providers.tsx](../fe/app/providers.tsx) | Rewrite | Wrap provider messages tiếng Việt + `ThemeProvider` (next-themes) + `QueryClientProvider` + hydrate site-config store |
| [fe/app/globals.css](../fe/app/globals.css) | Update | Thêm Tailwind theme tokens `--color-brand-*`, `--font-heading`, `--font-body` |

### 3.3. Verify Phase 0

```bash
# Backend
cd be
yarn install
# Sửa be/.env: điền GOOGLE_CLIENT_ID/SECRET + CLOUDINARY_*
yarn prisma generate
yarn prisma migrate dev --name init_full_schema   # tạo DB vhdcorp_dev nếu chưa có
yarn prisma db seed                                # seed admin + categories + sample data
yarn start:dev                                     # http://localhost:8000/api

# Frontend (terminal khác)
cd fe
yarn install
# Sửa fe/.env.local: điền NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
yarn dev                                           # http://localhost:3000
```

**Kỳ vọng**:
- Mở `http://localhost:3000` thấy "Trang chủ" theme variables apply, không lỗi hydration
- Swagger `http://localhost:8000/api/docs` load được
- Toggle dark/light qua next-themes hoạt động

---

## 4. Tóm tắt Phase 1 → 7 (sẽ chi tiết khi tới)

### Phase 1 — Backend Authentication
- DTO: `register`, `login`, `change-password`
- Strategy: `jwt.strategy.ts` (đọc cookie), `google.strategy.ts` (passport-google-oauth20)
- Service: `register`, `login(isAdmin?)`, `googleCallback`, `refresh`, `logout`, helper `setAuthCookies/clearAuthCookies`
- Controller: `POST /auth/register|login|admin/login|refresh|logout`, `GET /auth/google|google/callback|me`

### Phase 2 — Backend Domain Modules
- 8 modules: `user`, `category`, `product`, `post`, `review`, `banner`, `media`, `site-config`
- Cross-cutting: `services/cloudinary` (sign upload), `services/slug` (dedupe), `pagination.interceptor`

### Phase 3 — Frontend Foundation Layer
- `fe/services/{domain}.service.ts` — TanStack Query hooks (`useXxxList`, `useXxx`, mutation)
- `fe/hooks/` — `use-auth`, `use-site-config`, `use-debounced-value`, `use-scroll-progress`, `use-reduced-motion`
- `fe/types/` — types per domain
- Locale switcher + theme toggle component

### Phase 4 — Client UI (public)
- 12 routes Apple-style + animation
- `section-renderer.tsx` + `page-renderer.tsx` (đọc SiteConfig)
- 10 section components (hero, featured-products, banner-slider, blog-preview, testimonials, contact-cta, stats-counter, partners, custom-html, category-grid)
- `fe/lib/animations.ts` — Framer Motion variants + GSAP utils
- `fe/components/client/effects/` — scroll-reveal, parallax, magnetic-button, marquee, cursor-glow
- `fe/components/client/three/` — 3D scenes dynamic import, respect reduced-motion

### Phase 5 — Admin UI
- Sidebar + topbar
- DataTable (TanStack Table) + form-field (RHF + Zod)
- Tiptap rich editor + Cloudinary widget + media picker
- 9 routes: dashboard, products, categories, posts, users, reviews, banners, media, settings
- Admin login email/password ONLY

### Phase 6 — Visual Page Builder
- 3-panel: left (sections/components/pages/theme/history), center (iframe canvas), right (property panel)
- Builder store Zustand với undo/redo (50 steps), responsive toggle
- Auto-save 30s, beforeunload warning, keyboard shortcuts
- Preview route `/preview?draft=1`
- History viewer + restore version

### Phase 7 — SEO + Polish
- `sitemap.ts`, `robots.ts`, `manifest.ts`
- JSON-LD: Organization, WebSite+SearchAction, Product, Article, BreadcrumbList
- OG image dynamic (next/og)
- Analytics conditional (GA4 + GTM)
- WCAG 2.1 AA, Lighthouse ≥ 95 SEO / ≥ 90 A11y / ≥ 85 Perf

---

## 5. Pre-commit hook — Setup chuẩn

**Mục tiêu**: chặn commit nếu code lỗi format/lint/type. Không skip hook trừ khi user yêu cầu.

### 5.1. Stack

- **husky** — quản lý git hooks ở root
- **lint-staged** — chỉ chạy linter trên file đã staged (nhanh)
- **prettier** — format toàn bộ JS/TS/JSON/MD (đã có sẵn ở `be/`, sẽ thêm `fe/`)
- **eslint** — đã có ở cả `fe/` và `be/`

### 5.2. Cấu trúc

```text
vhdcorp/
├── package.json                  # Root - chứa husky, lint-staged, scripts gọi xuống fe/be
├── .husky/
│   └── pre-commit                # Shell script: chạy `yarn lint-staged` trước khi commit
├── .lintstagedrc.json            # Map glob → command per workspace
├── .prettierrc                   # Format rules chung
├── .prettierignore
├── fe/
│   └── package.json              # Có `lint`, `lint:fix`, `format`, `type-check`
└── be/
    └── package.json              # Có `lint`, `format` (đã có), `type-check`
```

### 5.3. Rules áp dụng cho mỗi commit

- **fe/**:
  - `*.{ts,tsx}` → `eslint --fix` + `prettier --write` + `tsc --noEmit` (type-check)
  - `*.{json,css,md}` → `prettier --write`
- **be/**:
  - `*.ts` → `eslint --fix` + `prettier --write` + `tsc --noEmit`
  - `*.{json,md}` → `prettier --write`

### 5.4. Scripts root (`package.json`)

```jsonc
{
  "name": "vhdcorp",
  "private": true,
  "scripts": {
    "prepare": "husky",
    "lint:fe": "yarn --cwd fe lint",
    "lint:be": "yarn --cwd be lint",
    "format:fe": "yarn --cwd fe format",
    "format:be": "yarn --cwd be format",
    "type-check:fe": "yarn --cwd fe type-check",
    "type-check:be": "yarn --cwd be type-check"
  },
  "devDependencies": {
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3"
  }
}
```

### 5.5. Bỏ qua hook (chỉ khi user explicitly yêu cầu)

- `git commit --no-verify` — không khuyến nghị, chỉ dùng khi cần fix gấp và đã review tay
- KHÔNG bao giờ thêm `--no-verify` vào script CI/CD hay alias

---

## 6. Naming convention nhắc nhanh

- File/folder: **kebab-case** (`product-card.tsx`, `current-user.decorator.ts`)
- Variable / function / type: **camelCase** / **PascalCase**
- Comment trong code: **tiếng Việt**
- Routes / API path / variable name: **tiếng Anh**
- UI string: **qua `messages/vi.json`**, KHÔNG hardcode

---

## 7. Tham khảo nhanh

- [AGENTS.md](../AGENTS.md) — rules tuyệt đối
- [docs/PRD.md](PRD.md) — routes, features, auth flow, builder spec
- [docs/DATABASE.md](DATABASE.md) — 9 models Prisma đầy đủ
- [fe/clinet-DESIGN.md](../fe/clinet-DESIGN.md) — UI Apple-style cho client public
- [fe/admin-genesis-DESIGN.md](../fe/admin-genesis-DESIGN.md) — UI Genesis editorial cho admin
- Plan chi tiết: `~/.claude/plans/oke-code-cho-t-i-curious-teacup.md`
- Context7 MCP đã cấu hình tại [.mcp.json](../.mcp.json)
