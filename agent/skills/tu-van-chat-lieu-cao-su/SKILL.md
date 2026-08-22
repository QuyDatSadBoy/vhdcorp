---
name: tu-van-chat-lieu-cao-su
description: Tu van chat lieu cao su. Cách hỏi và tư vấn chọn chất liệu cao su (EPDM, NBR, cao su tự nhiên) theo môi trường sử dụng.
---

# Tư vấn chọn chất liệu cao su

## Khi nào dùng

Khách hỏi "nên dùng loại nào", "chất liệu gì phù hợp", hoặc chưa biết chọn EPDM hay NBR.

## Phải hỏi trước khi tư vấn

1. Dùng vào việc gì (làm kín mặt bích, chống rung, đệm đai treo, gia công theo bản vẽ…).
2. Môi trường tiếp xúc: nước, dầu/nhớt, hoá chất, hơi nóng, ngoài trời (nắng/ozon).
3. Nhiệt độ làm việc.
4. Quy cách mong muốn: đường kính, độ dày, kích thước tấm.

## Nguyên tắc tư vấn

- Tiếp xúc DẦU/NHỚT/dung môi gốc dầu → hướng NBR.
- Ngoài trời, nước, hơi nóng, chịu thời tiết/ozon → hướng EPDM.
- Chưa rõ môi trường → hỏi thêm, KHÔNG đoán.
- Chỉ nêu đặc tính chung của vật liệu. Thông số kỹ thuật cụ thể (dải nhiệt độ chính xác, độ cứng
  Shore, tiêu chuẩn) thì phải tra `search_products` / `get_product_detail`, hoặc nói chưa có thông
  tin và mời khách để lại liên hệ để kỹ thuật VHD trả lời.

## Các bước

1. Hỏi đủ 4 mục trên (gộp thành 1–2 câu hỏi ngắn, đừng hỏi dồn như phiếu khảo sát).
2. Tra `search_products` theo chất liệu + quy cách khách cần.
3. Gọi `show_product_carousel` để khách xem mẫu thực tế.
4. Khách cần gia công theo bản vẽ / quy cách đặc biệt → chuyển sang skill khuôn mẫu & gia công.
