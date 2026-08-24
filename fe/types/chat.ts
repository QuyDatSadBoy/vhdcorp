/**
 * Types cho chat widget ↔ Agent service (FastAPI :8001).
 * Contract SSE theo AGENT_PLAN.md §3 + §9.2 (generative UI):
 * conversation | message.delta | tool.start | tool.end | ui | done | error.
 */

/** Vai trò tin nhắn */
export type ChatRole = "user" | "assistant";

/** Sản phẩm chuẩn hóa dùng chung cho mọi gen-UI block (carousel, quote, image-search…) */
export interface ChatProduct {
  name: string;
  /** VND, null = liên hệ báo giá */
  price: number | null;
  /** Giá gốc khi đang khuyến mãi — hiện gạch ngang */
  originalPrice?: number | null;
  /** URL ảnh; "" = không có → dùng placeholder brand */
  image: string;
  slug: string;
  stock: number;
  category: string;
}

/** Hội thoại (GET /api/conversations) */
export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

/** Tin nhắn đã lưu trên server (GET /api/conversations/{id}/messages) */
export interface ConversationMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  /** Gen-UI blocks đã persist kèm message assistant — reload không mất (§9.2) */
  ui_blocks?: { component: string; props: Record<string, unknown> }[];
  /** Số đo lượt trả lời do máy chủ lưu — mở lại lịch sử vẫn thấy */
  metrics?: {
    in_tokens?: number;
    out_tokens?: number;
    total_tokens?: number;
    model?: string;
    elapsed?: number;
  };
}

/* ─── SSE events từ POST /api/chat ─────────────────────────── */

/** Chỉ phát khi hội thoại mới được tạo (message đầu tiên) */
export interface ConversationCreatedEvent {
  type: "conversation";
  id: string;
  title: string;
}

/** Một đoạn token của câu trả lời */
export interface MessageDeltaEvent {
  type: "message.delta";
  content: string;
}

/** Agent bắt đầu gọi tool (search_products / web_search / send_contact_request…) */
export interface ToolStartEvent {
  type: "tool.start";
  name: string;
  /** Tham số đã rút gọn (≤600 ký tự) — hiện trong log tiến trình khi khách mở ra xem */
  input?: string;
}

/** Tool chạy xong */
export interface ToolEndEvent {
  type: "tool.end";
  name: string;
  /** Kết quả đã rút gọn (≤600 ký tự) */
  output?: string;
}

/** Trạng thái một việc trong kế hoạch của agent (DeepAgents `write_todos`) */
export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoItem {
  content: string;
  status: TodoStatus;
}

/**
 * Agent tự lập kế hoạch nhiều bước (DeepAgents `write_todos`). Mỗi lần phát là
 * TOÀN BỘ danh sách mới (thay thế danh sách cũ, không phải diff từng việc).
 */
export interface TodoEvent {
  type: "todo";
  items: TodoItem[];
}

/**
 * Generative UI: agent yêu cầu FE render 1 component inline trong luồng chat
 * (§9.2). Phát ngay sau tool.end, TRƯỚC message.delta.
 */
export interface UiEvent {
  type: "ui";
  /** tên component kebab-case: product-carousel | contact-form | quote-request | comparison-table | faq | image-search-result */
  component: string;
  props: Record<string, unknown>;
}

/** Stream kết thúc thành công */
export interface DoneEvent {
  type: "done";
  message_id: string;
}

/** Lỗi phía agent */
export interface AgentErrorEvent {
  type: "error";
  message: string;
}

export type AgentStreamEvent =
  | ConversationCreatedEvent
  | MessageDeltaEvent
  | ToolStartEvent
  | ToolEndEvent
  | TodoEvent
  | UiEvent
  | DoneEvent
  | AgentErrorEvent;

/* ─── UI state ──────────────────────────────────────────────── */

/** Một block gen-UI đã nhận, kèm id local để React key ổn định khi stream */
export interface UiBlock {
  id: string;
  component: string;
  props: Record<string, unknown>;
}

/** Trạng thái một lần gọi tool trong log hoạt động */
export type ToolRunState = "running" | "ok" | "error";

/** Một dòng log hoạt động: tool nào đang/đã chạy, kèm tham số & kết quả rút gọn */
export interface ToolRun {
  id: string;
  /** Tên tool phía agent (search_products…) */
  name: string;
  /** Nhãn tiếng Việt cho khách đọc */
  label: string;
  state: ToolRunState;
  input?: string;
  output?: string;
}

/** Tin nhắn hiển thị trong khung chat (client-side, kèm trạng thái stream/lỗi) */
export interface UiChatMessage {
  /** id local (crypto.randomUUID) hoặc id server sau khi done */
  id: string;
  role: ChatRole;
  content: string;
  /** ISO string */
  createdAt: string;
  /** Đang nhận delta từ SSE */
  streaming?: boolean;
  /** Vừa stream xong TRONG phiên này — voice mode chỉ tự đọc tin này (không đọc lịch sử cũ) */
  finishedLive?: boolean;
  /** Thông báo lỗi — hiện bubble đỏ + nút "Thử lại" */
  error?: string;
  /** data URL ảnh khách đã đính kèm (chỉ bubble user) */
  image?: string;
  /** Các block gen-UI agent yêu cầu render inline (chỉ bubble assistant) */
  uiBlocks?: UiBlock[];
  /** Số đo của lượt trả lời — hiện dưới bong bóng như ChatGPT/deepseek-harness */
  metrics?: ChatMetrics;
}

/** Số đo một lượt trả lời (đo ở trình duyệt, không phải con số server báo). */
export interface ChatMetrics {
  /** Giây tới chữ đầu tiên — cảm nhận "nhanh hay chậm" nằm ở con số này */
  ttft: number;
  /** Tổng giây của cả lượt */
  total: number;
  /** Số ký tự trả lời (dùng để ước lượng tốc độ đọc ra) */
  chars: number;
  /** Trả từ bộ nhớ đệm, không gọi mô hình */
  cached?: boolean;
  /** Token THẬT do nhà cung cấp báo (không phải ước lượng ở trình duyệt) */
  inTokens?: number;
  outTokens?: number;
  totalTokens?: number;
  /** Model thực chạy lượt đó — hữu ích khi chuỗi dự phòng đổi model giữa đường */
  model?: string;
}
