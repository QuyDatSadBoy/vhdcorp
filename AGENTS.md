# AGENTS.md — VHD Corp

## Bước đầu tiên — BẮT BUỘC

Đọc **cả hai file** trước khi code. Đây là source of truth. Không suy diễn nếu đã định nghĩa ở đây.

1. [`docs/PRD.md`](docs/PRD.md) — routes, tính năng, auth flow, builder spec, dependencies
2. [`docs/DATABASE.md`](docs/DATABASE.md) — **9 models đầy đủ**, schema Prisma, index strategy, design decisions

Dùng **skill** phù hợp + tra **Context7 MCP** cho docs thư viện. Để đảm bảo đáp ứng yêu cầu Web chuẩn SEO + Admin có toàn quyền tùy chỉnh mọi thứ từ ui cho đến tất cả. Web thật nhiều animation 3d để tạo ấn tượng.

---

## Stack

- **FE**: Next.js 16 App Router · React 19 · shadcn/ui · Tailwind CSS v4 · TypeScript
- **BE**: NestJS · Prisma · PostgreSQL
- **Package manager: `yarn`** — KHÔNG dùng npm, pnpm, hay bun

---

## Cấu trúc thư mục — Đặt đúng hay không được merge

### Frontend (`fe/`)

```text
fe/
├── app/
│   ├── (client)/               # Route group client — có Header/Footer layout
│   │   ├── layout.tsx
│   │   ├── page.tsx            # /
│   │   ├── products/           # /products, /products/[slug]
│   │   ├── categories/[slug]/  # /categories/[slug]
│   │   ├── posts/              # /posts, /posts/[slug]
│   │   ├── about/
│   │   ├── contact/
│   │   └── search/
│   ├── (auth)/                 # Route group auth — không có Header/Footer
│   │   ├── login/
│   │   ├── register/
│   │   └── callback/           # Google OAuth redirect landing
│   ├── account/                # Protected — middleware kiểm tra cookie
│   │   ├── layout.tsx
│   │   ├── profile/
│   │   └── password/
│   └── admin/                  # Protected — role admin/staff
│       ├── layout.tsx
│       ├── login/              # PUBLIC — email/password ONLY, không Google OAuth
│       ├── dashboard/
│       ├── products/           # list + /new + /[id]
│       ├── posts/              # list + /new + /[id]
│       ├── categories/ users/ reviews/
│       ├── banners/ media/ settings/
│       └── builder/            # Visual Page Builder
├── components/
│   ├── client/                 # Header, Footer, ProductCard, ... — export default
│   ├── admin/                  # Sidebar, DataTable, ... — export default
│   ├── builder/                # DnD canvas, left panel, right panel
│   └── ui/                     # shadcn/ui primitives — CHỈ thêm mới, KHÔNG sửa
├── services/                   # {domain}.service.ts — axios + TanStack Query hooks
├── store/                      # {name}.store.ts — Zustand (auth, ui, siteConfig)
├── hooks/                      # use-{name}.ts — custom hooks
├── lib/                        # axios.ts, utils.ts, cloudinary.ts
├── types/                      # {domain}.ts — TypeScript interfaces
└── messages/
    └── vi.json                 # Chuỗi UI tiếng Việt duy nhất
```

### Backend (`be/src/`)

```text
be/src/
├── models/                     # Mỗi domain = 1 module riêng
│   └── {domain}/
│       ├── {domain}.module.ts
│       ├── {domain}.controller.ts   # Nhận request → gọi service
│       ├── {domain}.service.ts      # Toàn bộ business logic, gọi Prisma
│       └── dto/
│           ├── create-{domain}.dto.ts
│           └── update-{domain}.dto.ts
├── authentication/             # Login, register, refresh, OAuth, logout
├── health/                     # Health check endpoint
├── common/
│   ├── guards/                 # JwtAuthGuard, RolesGuard, CsrfGuard
│   ├── decorators/             # @Roles(), @CurrentUser()
│   ├── interceptors/           # Transform, SanitizeHtml, Pagination
│   ├── pipes/                  # Validation, ParseInt
│   └── exceptions/             # HttpExceptionFilter
├── services/                   # Cross-cutting: csrf/, cloudinary/, slug/
├── prisma/                     # PrismaService
└── providers/                  # jwt.provider.ts, throttle.provider.ts
```

---

## Rules — Cấm vi phạm

**Frontend:**

- Fetch API trong component → **SAI**. Phải qua `fe/services/`
- Hardcode string UI → **SAI**. Phải qua `useTranslations()` và `messages/vi.json`
- Tạo/toggle ngôn ngữ khác → **SAI**. UI chỉ hỗ trợ tiếng Việt
- `<img>` → **SAI**. Dùng `next/image` với `sizes` + `priority`
- `"use client"` thêm bừa → **SAI**. Chỉ thêm khi có event handler / hook / browser API
- Barrel `index.ts` trong FE → **SAI** (ngoại lệ duy nhất: `fe/store/index.ts`)
- Admin-configurable value hardcode → **SAI**. Đọc từ `siteConfigStore`
- Dark mode thiếu `dark:` variant → **SAI**

**Backend:**

- Business logic trong Controller → **SAI**. Chỉ ở Service
- `process.env.*` trực tiếp → **SAI**. Dùng `ConfigService`
- Trust raw body không qua DTO → **SAI**. Phải có `class-validator`
- Xóa thật Product/Post/User → **SAI**. Dùng soft delete (`deletedAt`)
- Admin endpoint thiếu `@Roles('admin')` → **SAI**

**Naming:** file/folder → `kebab-case` · variable/type → `camelCase`/`PascalCase` · comment → tiếng Việt

---

## Auth Rules

- JWT → **HttpOnly Cookie** — không trả trong body, không đọc từ Authorization header
- `refresh_token` → hash bcrypt → lưu `User.refreshTokenHash` → xóa khi logout
- **Client** `/login`: email/password + Google OAuth
- **Admin** `/admin/login`: email/password **ONLY** — không Google OAuth
- Brand/theme/nav/footer → `SiteConfig` JSONB → đọc từ `siteConfigStore`

---

## Skills — Đọc SKILL.md trước khi code

| Task                                   | Skill file                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| NestJS module, guard, DTO, interceptor | `.agents/skills/nestjs-best-practices/SKILL.md`                                                    |
| Next.js page, component, data fetching | `.agents/skills/vercel-react-best-practices/SKILL.md`                                              |
| TanStack Query                         | `.agents/skills/tanstack-query-best-practices/SKILL.md`                                            |
| Form + Zod                             | `.agents/skills/react-hook-form-zod/SKILL.md`                                                      |
| shadcn/ui                              | `.agents/skills/shadcn-ui/SKILL.md`                                                                |
| Tailwind CSS                           | `.agents/skills/tailwindcss/SKILL.md`                                                              |
| Prisma query                           | `.agents/skills/prisma-client-api/SKILL.md`                                                        |
| PostgreSQL schema                      | `.agents/skills/postgresql-table-design/SKILL.md`                                                  |
| SEO, metadata                          | `.agents/skills/seo/SKILL.md`                                                                      |
| Animation                              | `.agents/skills/framer-motion-animator/SKILL.md` hoặc `.agents/skills/gsap-scrolltrigger/SKILL.md` |
| TypeScript                             | `.agents/skills/typescript-best-practices/SKILL.md`                                                |

---

## Context7 MCP — Tra docs thư viện

```text
mcp_context7_resolve-library-id(libraryName: "next")
mcp_context7_get-library-docs(context7CompatibleLibraryID: "/vercel/next.js", topic: "app router")
```

---

## Checklist tự review — BẮT BUỘC

- [ ] Đọc `docs/PRD.md` + `docs/DATABASE.md` trước — không suy diễn nếu đã định nghĩa
- [ ] File đúng vị trí theo bảng trên, đúng naming
- [ ] FE: không fetch trong component, không hardcode UI string, không `<img>`, không `"use client"` thừa
- [ ] BE: logic ở Service, input qua DTO, soft delete, `@Roles` trên admin endpoints
- [ ] Auth: admin login không Google OAuth, JWT qua HttpOnly Cookie
