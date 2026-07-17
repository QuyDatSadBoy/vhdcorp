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
}

/** Tool chạy xong */
export interface ToolEndEvent {
  type: "tool.end";
  name: string;
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
}
