# UI Audit Round 2 — 2026/05/18

Tiếp nối `UI_AUDIT_2026_05_18.md`. Phạm vi vòng này: CORS, hệ thống xác nhận hành động, a11y form.

## 1. Tóm tắt thay đổi

| Hạng mục                          | File                                                                             | Kết quả                                         |
| --------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| CORS allow-all (giữ credentials)  | [be/src/main.ts](be/src/main.ts)                                                 | Reflective origin callback                      |
| AlertDialog primitive (shadcn)    | [fe/components/ui/alert-dialog.tsx](fe/components/ui/alert-dialog.tsx)           | Tạo mới (umbrella `radix-ui`)                   |
| ConfirmDialog provider + hook     | [fe/components/admin/confirm-dialog.tsx](fe/components/admin/confirm-dialog.tsx) | Promise-based `useConfirm()`                    |
| Mount provider                    | [fe/app/admin/layout.tsx](fe/app/admin/layout.tsx)                               | Bọc nhánh authorized (không bọc `/admin/login`) |
| Thay thế `window.confirm()`       | 9 file admin                                                                     | 10 callsite → AlertDialog có thương hiệu        |
| Sửa chuỗi tiếng Anh "Soft-delete" | [fe/app/admin/users/page.tsx](fe/app/admin/users/page.tsx)                       | Thành "Xóa tài khoản"                           |
| Profile dùng `<form>`             | [fe/app/account/profile/page.tsx](fe/app/account/profile/page.tsx)               | Submit qua Enter, type=submit                   |

## 2. CORS — allow-all giữ credentials

Yêu cầu: `cors để * hết nhé`. Spec CORS cấm `Access-Control-Allow-Origin: *` khi `credentials: true` (cookie JWT). Giải pháp: reflective callback, trả về đúng `Origin` của request:

```ts
// be/src/main.ts
app.enableCors({
  origin: (origin, callback) => callback(null, origin ?? true),
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-CSRF-TOKEN,X-Requested-With",
  exposedHeaders: "Content-Disposition",
  credentials: true,
});
```

Đã kiểm tra preflight (OPTIONS) trả về `Access-Control-Allow-Origin: http://localhost:3001` + `Access-Control-Allow-Credentials: true`.

## 3. Hệ thống ConfirmDialog

### Vấn đề

9 trang admin dùng `window.confirm()` — UI không thương hiệu, không thể style, lẫn lộn ngôn ngữ ("Soft-delete"), không hỗ trợ destructive variant.

### Giải pháp

1. Tạo shadcn `AlertDialog` primitive dựa trên umbrella `radix-ui` (khớp với pattern hiện có ở `dialog.tsx`).
2. Provider Promise-based:

```tsx
const confirm = useConfirm();
const ok = await confirm({
  title: "Xóa sản phẩm?",
  description: "Sản phẩm sẽ bị xóa khỏi cửa hàng.",
  confirmText: "Xóa",
  variant: "destructive", // nút xác nhận đỏ
});
if (!ok) return;
```

3. Provider mount **bên trong** nhánh `authorized` của `fe/app/admin/layout.tsx` — không load context ở `/admin/login` (giảm bundle, tránh hook fail ở public route).

### Các callsite đã thay

- [fe/app/admin/users/page.tsx](fe/app/admin/users/page.tsx) (xóa tài khoản, destructive)
- [fe/app/admin/posts/page.tsx](fe/app/admin/posts/page.tsx) (xóa bài, destructive)
- [fe/app/admin/products/page.tsx](fe/app/admin/products/page.tsx) (xóa sản phẩm, destructive)
- [fe/app/admin/categories/page.tsx](fe/app/admin/categories/page.tsx) (xóa danh mục, destructive)
- [fe/app/admin/banners/page.tsx](fe/app/admin/banners/page.tsx) (xóa banner, destructive)
- [fe/app/admin/media/page.tsx](fe/app/admin/media/page.tsx) (xóa ảnh, destructive)
- [fe/app/admin/reviews/page.tsx](fe/app/admin/reviews/page.tsx) (xóa review, destructive)
- [fe/app/admin/settings/page.tsx](fe/app/admin/settings/page.tsx) (xuất bản, default)
- [fe/app/admin/builder/page.tsx](fe/app/admin/builder/page.tsx) (thay layout mặc định + xuất bản, mixed)

Mỗi dialog có description giải thích hậu quả (vd: "danh mục con sẽ thành mồ côi", "khách truy cập sẽ thấy phiên bản mới") — giảm tác vụ xóa nhầm.

## 4. A11y form profile

`fe/app/account/profile/page.tsx` đang dùng `<motion.div>` + `Button onClick={save}` → người dùng không thể submit bằng Enter, screen reader không nhận dạng được landmark form.

Đã chuyển sang `<motion.form onSubmit={save}>` với `Button type="submit"`. Trang `password` đã đúng form từ trước, không sửa.

## 5. Verification

| Bước                         | Kết quả                                |
| ---------------------------- | -------------------------------------- |
| `yarn build` (BE)            | PASS                                   |
| `yarn build` (FE)            | PASS — Next.js 16.2.4 Turbopack, 8.92s |
| `get_errors` 12 file đã chạm | 0 errors                               |
| `grep "if (!confirm("` admin | 0 hits                                 |
| CORS preflight (OPTIONS)     | 204 + đầy đủ header                    |

## 6. Không thay đổi (có chủ ý)

- `fe/components/admin/admin-table.tsx`: đã sẵn loading state và empty placeholder mặc định "Chưa có dữ liệu." → audit subagent nhận định sai, không sửa.
- `fe/app/account/password/page.tsx`: đã đúng `<form>` + `type="submit"` + `disabled={pending}` + `autoComplete` — không cần sửa.
- Dashboard hex colors: lùi sang round sau (không phải UX blocker).
