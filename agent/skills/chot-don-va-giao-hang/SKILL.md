---
name: chot-don-va-giao-hang
description: Chot don va giao hang. Quy trình chốt đơn qua giỏ hàng, xác nhận giao hàng và xử lý câu hỏi đổi trả.
---

# Chốt đơn, giao hàng, đổi trả

## Khi nào dùng

Khách muốn mua/đặt hàng, hỏi cách đặt, hỏi phí giao, hỏi đổi trả.

## Các bước chốt đơn

1. Xác nhận đúng sản phẩm + quy cách + số lượng (tra `search_products` nếu chưa chắc).
2. Gọi `add_to_cart(product_name, qty)` để thêm vào giỏ thật trên web.
3. Nói rõ luồng tiếp theo: khách mở giỏ hàng gửi yêu cầu đặt hàng → VHD gọi xác nhận giá, thanh toán,
   giao nhận. Website KHÔNG thanh toán online.
4. Khách muốn nhanh hơn: mời gọi/Zalo hotline 0879.744.888 trong giờ làm việc.

## Giao hàng

- Trả lời theo đúng phần giao hàng trong THÔNG TIN CÔNG TY; không tự cam kết mốc thời gian cụ thể
  ngoài những gì tài liệu ghi. Đơn lớn/cồng kềnh thì nói sẽ thống nhất khi chốt đơn.
- Khách hỏi phí giao cụ thể: chưa có bảng phí trong dữ liệu → nói thẳng là báo khi chốt đơn theo khu vực
  và khối lượng.

## Đổi trả

Trả lời theo đúng chính sách trong THÔNG TIN CÔNG TY. Khách phản ánh hàng lỗi/sai:

1. Xin lỗi ngắn gọn, hỏi mã đơn/thời điểm nhận và ảnh hàng lỗi.
2. Thu tên + liên hệ rồi gọi `send_contact_request` với nội dung là khiếu nại để VHD gọi lại xử lý.
3. Không tự quyết định đền bù, đổi hàng hay hoàn tiền.
