/**
 * Nhãn tiếng Việt cho từng công cụ của trợ lý — dùng CHUNG cho khung chat khách và
 * trang trợ lý quản trị, để cùng một công cụ không hiện hai cách gọi khác nhau.
 *
 * Tên công cụ mới chưa kịp thêm vào đây vẫn hiện được nhờ nhãn dự phòng, nên thiếu
 * một dòng ở đây không bao giờ làm log trống.
 */
export const TOOL_STEP_LABELS: Record<string, string> = {
  get_current_time: "Đang xem ngày giờ hiện tại…",
  search_products: "Đang tìm kiếm trong kho VHD…",
  get_product_detail: "Đang lấy thông tin chi tiết sản phẩm…",
  show_product_carousel: "Đang tìm kiếm & chọn lọc sản phẩm…",
  show_comparison: "Đang lập bảng so sánh…",
  get_recommendations: "Đang chọn gợi ý phù hợp với bạn…",
  list_categories: "Đang tổng hợp danh mục hàng…",
  search_posts: "Đang tìm bài viết liên quan…",
  get_company_info: "Đang lấy thông tin liên hệ chính thức…",
  add_to_cart: "Đang thêm sản phẩm vào giỏ…",
  show_quote_form: "Đang chuẩn bị form báo giá…",
  create_quote_request: "Đang gửi yêu cầu báo giá…",
  show_contact_form: "Đang mở form liên hệ…",
  send_contact_request: "Đang gửi thông tin liên hệ…",
  show_faq: "Đang tra cứu câu hỏi thường gặp…",
  search_knowledge: "Đang tra cứu tài liệu công ty…",
  web_search: "Đang tra cứu thêm trên web…",
  web_fetch: "Đang đọc trang bạn gửi…",
  ask_user_question: "Đang hỏi lại để tư vấn đúng…",
  // Công cụ của lõi DeepAgents (đọc quy trình nghiệp vụ, chia việc cho trợ lý phụ)
  read_file: "Đang đọc hướng dẫn nội bộ…",
  ls: "Đang xem danh sách hướng dẫn…",
  glob: "Đang tìm hướng dẫn phù hợp…",
  grep: "Đang tìm trong hướng dẫn…",
  task: "Đang giao việc cho trợ lý phụ…",
  write_todos: "Đang lập kế hoạch…",
};

/** Nhãn cho một công cụ; công cụ lạ vẫn có nhãn đọc được. */
export function toolLabel(name: string): string {
  return TOOL_STEP_LABELS[name] ?? "Đang xử lý…";
}
