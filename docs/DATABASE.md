# DATABASE.md — VHD Corp

> **Version:** 1.0.0 · **Date:** 2026-05-05
> **DB:** PostgreSQL · **ORM:** Prisma 7

---

## 1. Tổng quan — 9 Models

| Model | Mô tả | Soft delete |
| --- | --- | --- |
| `User` | Tài khoản (customer / staff / admin), hỗ trợ email+password và Google OAuth | ✅ |
| `Product` | Sản phẩm — có slug, ảnh Cloudinary, SEO meta | ✅ |
| `Category` | Danh mục cây đa cấp (self-relation) | ❌ |
| `Post` | Bài viết — draft/published/scheduled, Tiptap rich-text | ✅ |
| `Review` | Đánh giá sản phẩm — phải duyệt trước khi hiện | ❌ |
| `Banner` | Banner quảng cáo — admin quản lý, page builder dùng để chọn | ❌ |
| `Media` | Metadata ảnh Cloudinary — media browser trong admin | ❌ |
| `SiteConfig` | Cấu hình giao diện toàn site — JSONB | ❌ |
| `SiteConfigHistory` | Lịch sử snapshot SiteConfig để rollback | ❌ |

---

## 2. Enums

```prisma
enum Role          { CUSTOMER STAFF ADMIN }
enum ProductStatus { DRAFT PUBLISHED }
enum PostStatus    { DRAFT PUBLISHED SCHEDULED }
enum ReviewStatus  { PENDING APPROVED REJECTED }
enum ConfigStatus  { DRAFT PUBLISHED }
```

---

## 3. ERD — Quan hệ

```text
User ──< Review >── Product ──> Category
 │
 └──< Post

SiteConfig ──< SiteConfigHistory
```

| Quan hệ | Kiểu |
| --- | --- |
| User → Review | 1 – n |
| User → Post | 1 – n (author) |
| Product → Category | n – 1 |
| Category → Category | self-referential (cây đa cấp) |
| Review → Product | n – 1 |
| SiteConfig → SiteConfigHistory | 1 – n |

---

## 4. Prisma Schema đầy đủ

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  output        = "./generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role          { CUSTOMER STAFF ADMIN }
enum ProductStatus { DRAFT PUBLISHED }
enum PostStatus    { DRAFT PUBLISHED SCHEDULED }
enum ReviewStatus  { PENDING APPROVED REJECTED }
enum ConfigStatus  { DRAFT PUBLISHED }

// ─── Models ──────────────────────────────────────────────────────────────────

model User {
  id               Int       @id @default(autoincrement())
  email            String    @unique
  password         String?                        // null nếu chỉ dùng Google OAuth
  name             String    @default("")
  role             Role      @default(CUSTOMER)
  avatar           String?
  googleId         String?   @unique              // null nếu chỉ dùng email/password
  refreshTokenHash String?                        // bcrypt hash, xóa khi logout
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?                      // soft delete

  reviews Review[]
  posts   Post[]

  @@index([deletedAt])
  @@map("users")
}

model Category {
  id        Int        @id @default(autoincrement())
  slug      String     @unique
  name      String
  image     String?
  parentId  Int?
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  order     Int        @default(0)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  products Product[]

  @@index([parentId])
  @@map("categories")
}

model Product {
  id          Int           @id @default(autoincrement())
  slug        String        @unique
  name        String
  description String        @db.Text
  price       Decimal       @db.Decimal(12, 2)
  stock       Int           @default(0)
  images      String[]                           // Cloudinary URLs
  categoryId  Int
  category    Category      @relation(fields: [categoryId], references: [id])
  metaTitle   String?
  metaDesc    String?
  ogImage     String?
  status      ProductStatus @default(DRAFT)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?                          // soft delete

  reviews Review[]

  @@index([categoryId])
  @@index([status])
  @@index([deletedAt])
  @@index([createdAt])
  @@map("products")
}

model Post {
  id          Int        @id @default(autoincrement())
  slug        String     @unique
  title       String
  content     String     @db.Text               // Tiptap HTML/JSON
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  metaTitle   String?
  metaDesc    String?
  ogImage     String?
  tags        String[]
  authorId    Int
  author      User       @relation(fields: [authorId], references: [id])
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?                          // soft delete

  @@index([status])
  @@index([publishedAt])
  @@index([deletedAt])
  @@map("posts")
}

model Review {
  id        Int          @id @default(autoincrement())
  productId Int
  product   Product      @relation(fields: [productId], references: [id])
  userId    Int
  user      User         @relation(fields: [userId], references: [id])
  rating    Int                                  // 1–5
  content   String
  status    ReviewStatus @default(PENDING)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([productId, userId])                  // 1 user chỉ review 1 sản phẩm 1 lần
  @@index([status])
  @@map("reviews")
}

model Banner {
  id        Int      @id @default(autoincrement())
  imageUrl  String
  link      String?
  alt       String?
  position  String                               // "HOME_TOP" | "HOME_MID" | "SIDEBAR"
  active    Boolean  @default(true)
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([position, active])
  @@map("banners")
}

model Media {
  id         Int      @id @default(autoincrement())
  url        String
  publicId   String   @unique                   // Cloudinary public_id
  folder     String                             // "products" | "posts" | "banners" | ...
  format     String                             // "jpg" | "png" | "webp" | ...
  width      Int?
  height     Int?
  bytes      Int?
  tags       String[]
  uploadedBy Int                                // userId (không formal relation)
  createdAt  DateTime @default(now())

  @@index([folder])
  @@map("media")
}

model SiteConfig {
  id        Int          @id @default(autoincrement())
  key       String       @unique @default("main") // chỉ có 1 bản ghi "main"
  value     Json                                 // toàn bộ JSONB schema (xem PRD section 4)
  version   Int          @default(1)
  status    ConfigStatus @default(DRAFT)
  updatedBy Int                                  // userId (không formal relation)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  history SiteConfigHistory[]

  @@index([key, status])
  @@map("site_configs")
}

model SiteConfigHistory {
  id       Int        @id @default(autoincrement())
  configId Int
  config   SiteConfig @relation(fields: [configId], references: [id])
  snapshot Json                                 // full value tại thời điểm save
  version  Int
  savedBy  Int                                  // userId
  createdAt DateTime  @default(now())

  @@index([configId])
  @@map("site_config_histories")
}
```

---

## 5. Index Strategy

| Table | Index | Lý do |
| --- | --- | --- |
| `users` | `email` (unique), `googleId` (unique) | Lookup auth |
| `users` | `deletedAt` | Filter soft-deleted |
| `products` | `slug` (unique) | SEO URL lookup |
| `products` | `categoryId`, `status`, `deletedAt`, `createdAt` | Filter + sort |
| `categories` | `slug` (unique), `parentId` | URL + tree traversal |
| `posts` | `slug` (unique) | SEO URL lookup |
| `posts` | `status`, `publishedAt`, `deletedAt` | Filter + sort |
| `reviews` | `productId, userId` (unique) | Prevent duplicate + filter |
| `reviews` | `status` | Admin moderate |
| `banners` | `position, active` | Composite — load active banner by position |
| `media` | `publicId` (unique), `folder` | Cloudinary lookup + browser filter |
| `site_configs` | `key, status` | Load published config |
| `site_config_histories` | `configId` | Load history by config |

**Full-text search** (thêm qua raw SQL migration):

```sql
-- Tìm kiếm sản phẩm
CREATE INDEX products_name_fts ON products USING GIN (to_tsvector('simple', name));

-- Tìm kiếm bài viết
CREATE INDEX posts_title_fts ON posts USING GIN (to_tsvector('simple', title));
```

---

## 6. Design Decisions

| Quyết định | Lý do |
| --- | --- |
| `password` nullable trên User | Hỗ trợ Google OAuth — user có thể không có password |
| `googleId` nullable & unique | User có thể link Google sau, mỗi Google account chỉ 1 user |
| `refreshTokenHash` bcrypt | Token bị đánh cắp từ DB không dùng được — phải có token gốc |
| `@@unique([productId, userId])` trên Review | 1 user chỉ được đánh giá 1 sản phẩm 1 lần |
| `SiteConfig.key = "main"` | Chỉ có 1 config toàn site — key đảm bảo idempotent upsert |
| `Media.uploadedBy`, `SiteConfig.updatedBy` là `Int` (không relation) | Không cần navigate ngược User → Media/SiteConfig trong ORM |
| `@@map` snake_case | PostgreSQL convention cho table name |
| Soft delete chỉ trên User/Product/Post | Review là dữ liệu lịch sử, không xóa — chỉ đổi status |
