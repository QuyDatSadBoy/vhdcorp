# VHD Corp — Test Cases Chi Tiết

> Tester: AI Agent  
> Version: 1.0  
> Date: 2026-05-06  
> Mục tiêu: 100% PRD pass trước khi bàn giao khách hàng

---

## MODULE 1: AUTH CLIENT

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-001 | Admin login | Vào /admin/login, nhập admin@vhd.com / Admin1234!, nhấn Đăng nhập | Redirect về /admin/dashboard | ⏳ |
| TC-002 | Admin login sai mật khẩu | Nhập sai password | Hiện thông báo lỗi | ⏳ |
| TC-003 | Admin không có Google OAuth | Vào /admin/login | Không có nút Google | ⏳ |
| TC-004 | Client login email/password | Vào /login, đăng nhập bằng email/pass | Redirect /account | ⏳ |
| TC-005 | Register mới | Vào /register, tạo tài khoản mới | Tạo thành công, redirect /account | ⏳ |
| TC-006 | Logout | Đăng nhập xong, nhấn logout | Clear cookie, redirect về / | ⏳ |
| TC-007 | Protected route | Vào /account khi chưa đăng nhập | Redirect về /login?next=/account | ⏳ |

## MODULE 2: CLIENT PAGES

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-101 | Trang chủ render | Vào / | Hero 3D, sản phẩm, stats, blog | ⏳ |
| TC-102 | SEO metadata trang chủ | View source / | og:title, og:description, og:image | ⏳ |
| TC-103 | Dark mode toggle | Nhấn toggle dark/light | Giao diện đổi màu, persist reload | ⏳ |
| TC-104 | VI/EN toggle | Nhấn EN/VI | UI strings đổi ngôn ngữ | ⏳ |
| TC-105 | Products list | Vào /products | Danh sách sản phẩm, phân trang | ⏳ |
| TC-106 | Product detail | Click vào 1 sản phẩm | Trang chi tiết, ảnh, giá, mô tả | ⏳ |
| TC-107 | Product SEO JSON-LD | View source /products/[slug] | Schema Product JSON-LD có đủ | ⏳ |
| TC-108 | Categories | Vào /categories/[slug] | Sản phẩm theo danh mục | ⏳ |
| TC-109 | Posts list | Vào /posts | Danh sách bài viết | ⏳ |
| TC-110 | Post detail | Click vào 1 bài viết | Nội dung đầy đủ, rich text render | ⏳ |
| TC-111 | Contact form | Vào /contact, điền form, submit | Gửi thành công | ⏳ |
| TC-112 | Search | Vào /search?q=nhựa | Kết quả tìm kiếm | ⏳ |
| TC-113 | About page | Vào /about | Trang tải không lỗi | ⏳ |
| TC-114 | Sitemap | Vào /sitemap.xml | XML hợp lệ có products/posts | ⏳ |
| TC-115 | Robots.txt | Vào /robots.txt | Disallow /admin/, khai báo sitemap | ⏳ |
| TC-116 | 3D Hero animation | Load trang chủ | 3D scene chạy smooth | ⏳ |
| TC-117 | Stats counter animation | Scroll xuống stats | Số đếm animate | ⏳ |
| TC-118 | Partners marquee | Scroll xuống partners | Marquee chạy vô hạn | ⏳ |

## MODULE 3: ADMIN DASHBOARD

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-201 | Dashboard load | /admin/dashboard | KPIs hiển thị | ⏳ |
| TC-202 | Sidebar navigation | Click các mục sidebar | Navigate đúng route | ⏳ |

## MODULE 4: ADMIN PRODUCTS

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-301 | Danh sách sản phẩm | /admin/products | Bảng có products, phân trang | ⏳ |
| TC-302 | Tạo sản phẩm mới | /admin/products/new → điền form → submit | Tạo thành công, redirect list | ⏳ |
| TC-303 | Upload ảnh sản phẩm | Trong form new product, chọn file ảnh | Upload lên Cloudinary, hiện preview | ⏳ |
| TC-304 | Sửa sản phẩm | Click Edit → sửa tên → Save | Cập nhật thành công | ⏳ |
| TC-305 | Xóa sản phẩm (soft delete) | Click Delete | Sản phẩm không còn hiển thị ở list | ⏳ |
| TC-306 | SEO override | Điền metaTitle, metaDesc | Lưu và load lại có đủ | ⏳ |

## MODULE 5: ADMIN POSTS

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-401 | Danh sách bài viết | /admin/posts | Bảng có posts | ⏳ |
| TC-402 | Tạo bài viết với rich editor | /admin/posts/new → viết nội dung TipTap → submit | Tạo thành công | ⏳ |
| TC-403 | Upload ảnh vào bài viết | Trong TipTap editor, click image icon → chọn file | Upload lên Cloudinary, chèn vào editor | ⏳ |
| TC-404 | Upload ảnh bìa | Chọn file ảnh bìa | Upload lên Cloudinary | ⏳ |
| TC-405 | Publish bài viết | Set status = PUBLISHED | Hiển thị trên /posts | ⏳ |
| TC-406 | Draft bài viết | Set status = DRAFT | Không hiển thị trên /posts | ⏳ |

## MODULE 6: ADMIN CATEGORIES

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-501 | Danh sách danh mục | /admin/categories | Cây danh mục | ⏳ |
| TC-502 | Tạo danh mục | Nhập tên, slug auto → submit | Tạo thành công | ⏳ |
| TC-503 | Upload ảnh danh mục | Chọn file ảnh | Upload Cloudinary | ⏳ |

## MODULE 7: ADMIN MEDIA LIBRARY

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-601 | Media list | /admin/media | Lưới ảnh đã upload | ⏳ |
| TC-602 | Upload ảnh | Chọn file → upload | Upload Cloudinary, xuất hiện trong lưới | ⏳ |
| TC-603 | Xóa ảnh | Click xóa | Xóa khỏi list | ⏳ |

## MODULE 8: ADMIN BANNERS

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-701 | Banner list | /admin/banners | Danh sách banner | ⏳ |
| TC-702 | Tạo banner với ảnh | Upload ảnh + link → submit | Tạo thành công | ⏳ |
| TC-703 | Toggle active | Click toggle | Banner bật/tắt | ⏳ |

## MODULE 9: ADMIN USERS

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-801 | User list | /admin/users | Danh sách users | ⏳ |
| TC-802 | Xem user detail | Click user | Chi tiết user | ⏳ |
| TC-803 | Đổi role | Chọn role mới | Cập nhật thành công | ⏳ |

## MODULE 10: ADMIN SETTINGS

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-901 | Load settings | /admin/settings | Form hiển thị đầy đủ | ⏳ |
| TC-902 | Upload logo | Chọn file logo | Upload Cloudinary, preview | ⏳ |
| TC-903 | Lưu settings | Sửa tên site → Save | Lưu thành công | ⏳ |

## MODULE 11: VISUAL PAGE BUILDER

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-1001 | Builder load | /admin/builder | 3 panel, toolbar, canvas | ⏳ |
| TC-1002 | Reorder sections | Kéo thả section | Thứ tự thay đổi trên canvas | ⏳ |
| TC-1003 | Edit section props | Click section → sửa heading | Canvas update real-time | ⏳ |
| TC-1004 | Add section | Nhấn + Thêm section | Modal section types | ⏳ |
| TC-1005 | Hide section | Toggle visible | Section ẩn trên canvas | ⏳ |
| TC-1006 | Delete section | Click delete | Section bị xóa | ⏳ |
| TC-1007 | Undo/Redo | Ctrl+Z / Ctrl+Y | Hoàn tác đúng | ⏳ |
| TC-1008 | Responsive toggle | Click Mobile/Tablet/Desktop | Canvas width thay đổi | ⏳ |
| TC-1009 | Save Draft | Nhấn Save Draft | Lưu DB, không affect production | ⏳ |
| TC-1010 | Publish | Nhấn Publish | Config production cập nhật | ⏳ |
| TC-1011 | Theme colors | Tab Theme → đổi màu primary | Live preview trên canvas | ⏳ |
| TC-1012 | History restore | Tab History → Restore version cũ | Config về đúng version | ⏳ |
| TC-1013 | Upload bg image hero | Trong props Hero → chọn file | Upload Cloudinary, hiện preview | ⏳ |

## MODULE 12: SEO

| TC | Tính năng | Bước | Kết quả mong đợi | Status |
|---|---|---|---|---|
| TC-1101 | Open Graph tags | View source / | og:title, og:description, og:image có đúng | ⏳ |
| TC-1102 | JSON-LD Product | View source /products/[slug] | Schema.org Product JSON-LD | ⏳ |
| TC-1103 | JSON-LD Article | View source /posts/[slug] | Schema.org Article JSON-LD | ⏳ |
| TC-1104 | Sitemap | /sitemap.xml | Có đủ URLs | ⏳ |
| TC-1105 | Canonical | View source trang chi tiết | canonical link đúng URL | ⏳ |

---

## KẾT QUẢ TEST

Cập nhật sau khi test:
- ✅ PASS
- ❌ FAIL (ghi bug)
- ⏳ Chưa test
