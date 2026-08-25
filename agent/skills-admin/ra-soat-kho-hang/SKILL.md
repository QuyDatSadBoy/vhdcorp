---
name: ra-soat-kho-hang
description: "Ra soat kho hang. Cách trả lời câu hỏi thống kê về kho: số lượng sản phẩm, danh mục, hàng thiếu mô tả."
---

# Rà soát kho hàng

## Khi nào dùng

Admin hỏi "kho có bao nhiêu sản phẩm", "danh mục nào ít hàng", "sản phẩm nào thiếu mô tả".

## Các bước

1. `list_categories` để lấy danh sách danh mục thật.
2. `search_products` theo từng danh mục/từ khoá cần thống kê.
3. Đếm và báo cáo con số THẬT lấy được. Nếu tool không trả đủ dữ liệu để đếm chính xác,
   nói rõ "đây là số đếm được từ kết quả tra cứu, có thể chưa đầy đủ" — đừng làm tròn thành
   con số nghe chắc chắn.

## Gợi ý hữu ích cho admin

Sau khi báo số, nêu 1–2 việc đáng làm tiếp: danh mục nào nên bổ sung hàng, sản phẩm nào nên
viết lại mô tả cho chuẩn SEO. Chỉ gợi ý dựa trên dữ liệu vừa tra.
