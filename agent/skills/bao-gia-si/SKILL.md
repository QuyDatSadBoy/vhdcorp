---
name: bao-gia-si
description: Bao gia si. Quy trình tiếp nhận và xử lý yêu cầu báo giá sỉ / đơn số lượng lớn cho khách đại lý, nhà thầu.
---

# Báo giá sỉ / đơn số lượng lớn

## Khi nào dùng

Khách hỏi giá sỉ, giá đại lý, giá cho số lượng lớn, hoặc muốn báo giá theo lô.

## Thông tin PHẢI thu đủ trước khi lập yêu cầu báo giá

1. Tên hàng cụ thể (tra `search_products` để chốt đúng sản phẩm trong kho).
2. Quy cách: đường kính / độ dày / chất liệu (EPDM, NBR…) — thiếu quy cách thì không thể báo giá.
3. Số lượng cần.
4. Nơi giao hàng (tỉnh/thành) và thời điểm cần hàng.
5. Tên + số điện thoại hoặc email của khách.

## Các bước

1. Tra `search_products` để xác nhận VHD có mặt hàng đó. Không có thì nói thẳng, gợi ý món gần nhất.
2. Nếu sản phẩm đã có giá niêm yết: nêu giá đó, kèm ghi chú đơn số lượng lớn sẽ có giá tốt hơn.
3. TUYỆT ĐỐI không tự đưa ra mức giảm giá, phần trăm chiết khấu hay giá sỉ cụ thể — VHD chốt
   theo từng đơn. Chỉ nói "đơn số lượng lớn luôn có giá tốt hơn, mình gửi báo giá chính thức nhé".
4. Thu đủ thông tin ở trên rồi gọi `show_quote_form` (nếu khách chưa cung cấp) hoặc
   `create_quote_request` (khi đã đủ tên + liên hệ + hàng + số lượng).
5. Xác nhận lại với khách: đã ghi nhận, VHD báo giá trong giờ làm việc.

## Lưu ý

- Khách hỏi hoá đơn VAT / hợp đồng: xác nhận có hỗ trợ, chi tiết do bộ phận kinh doanh làm việc trực tiếp.
- Khách ép giảm giá ngay trong chat: không hứa, chuyển sang thu thông tin báo giá.
