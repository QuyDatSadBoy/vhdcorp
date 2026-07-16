export interface PaginatedResult<T> {
  records: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
  ogImage?: string | null;
  parentId: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category | null;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string | null;
  price: string | number;
  /** Giá khuyến mãi (Shopee-style) — hiển thị khi còn hạn saleEndsAt */
  salePrice?: string | number | null;
  saleEndsAt?: string | null;
  stock: number;
  images: string[];
  categoryId: number;
  category?: Pick<Category, "id" | "name" | "slug">;
  metaTitle: string | null;
  metaDesc: string | null;
  ogImage: string | null;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
  reviews?: Review[];
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  publishedAt: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  ogImage: string | null;
  tags: string[];
  authorId: number;
  author?: { id: number; name: string; avatar: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; avatar: string | null };
  product?: Pick<Product, "id" | "name" | "slug">;
}

export interface Banner {
  id: number;
  imageUrl: string;
  link: string | null;
  alt: string | null;
  position: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: number;
  url: string;
  publicId: string;
  folder: string;
  format: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  tags: string[];
  uploadedBy: number;
  createdAt: string;
}

export interface CloudinarySignedUpload {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  avatar: string | null;
  /** Tài khoản quản trị tối cao — không thể xóa/đổi role/reset mật khẩu */
  isRoot?: boolean;
  /** null = chưa xác minh email */
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/* ── Giỏ hàng / Đơn hàng / Voucher ── */
export interface OrderItem {
  id: number;
  productId: number;
  name: string;
  price: string | number;
  qty: number;
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPING" | "DONE" | "CANCELLED";

export interface Order {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  note?: string | null;
  status: OrderStatus;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  voucherCode?: string | null;
  createdAt: string;
  items: OrderItem[];
}

export type VoucherType = "PERCENT" | "FIXED";

export interface Voucher {
  id: number;
  code: string;
  type: VoucherType;
  value: string | number;
  minOrder: string | number;
  maxUses: number;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
}
