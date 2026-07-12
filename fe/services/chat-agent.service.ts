/**
 * Client cho Agent service (FastAPI :8001) — tách khỏi axios của BE NestJS
 * vì khác origin/credentials. Dùng fetch thường + header X-Chat-User.
 *
 * - Chat: POST /api/chat trả SSE → đọc bằng ReadableStream reader
 *   (không dùng EventSource vì cần POST body).
 * - Conversations: CRUD fetch JSON thường.
 */

import type { AgentStreamEvent, Conversation, ConversationMessage } from "@/types/chat";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8001";

/** localStorage key lưu uuid định danh khách (mỗi khách chỉ thấy hội thoại của mình) */
const UID_STORAGE_KEY = "vhd_chat_uid";

/** Lấy (hoặc tự sinh lần đầu) uuid khách — chỉ chạy phía client. */
export function getChatUserId(): string {
  if (typeof window === "undefined") return "";
  let uid = window.localStorage.getItem(UID_STORAGE_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    window.localStorage.setItem(UID_STORAGE_KEY, uid);
  }
  return uid;
}

function baseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Chat-User": getChatUserId(),
  };
}

/** fetch JSON + ném Error khi status không ok */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AGENT_URL}${path}`, {
    ...init,
    headers: { ...baseHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`Agent API lỗi ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface StreamChatParams {
  message: string;
  /** Bỏ trống → agent tự tạo hội thoại mới ở message đầu (đúng contract) */
  conversationId?: string | null;
  /** Ảnh đính kèm dạng data URL base64 (§9.4 image search) — có thì gửi kèm */
  image?: string | null;
  /** AbortController.signal — cho nút Stop */
  signal?: AbortSignal;
  /** Callback cho từng SSE event đã parse */
  onEvent: (event: AgentStreamEvent) => void;
}

/**
 * Gửi message và đọc SSE stream. Promise resolve khi stream đóng
 * (hoặc reject với AbortError/network error).
 */
export async function streamChat({ message, conversationId, image, signal, onEvent }: StreamChatParams): Promise<void> {
  const body: Record<string, unknown> = { message };
  if (conversationId) body.conversation_id = conversationId;
  if (image) body.image = image;

  const res = await fetch(`${AGENT_URL}/api/chat`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Agent API lỗi ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Đọc từng chunk, tách theo dòng; mỗi event là 1 dòng "data: {...}"
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // giữ lại phần dòng chưa hoàn chỉnh

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        onEvent(JSON.parse(payload) as AgentStreamEvent);
      } catch {
        // Bỏ qua dòng JSON hỏng (không làm gãy stream)
      }
    }
  }
}

/** Giới hạn ký tự gửi TTS — text dài hơn sẽ bị cắt (§9.3 voice reply) */
export const TTS_MAX_CHARS = 600;

/**
 * Voice reply: gọi BE proxy TTS (MiniMax) → trả về blob audio/mpeg để phát.
 * Cắt bớt text quá dài để tránh gọi tốn kém / lỗi.
 */
export async function speakText(text: string, signal?: AbortSignal): Promise<Blob> {
  const clipped = text.length > TTS_MAX_CHARS ? `${text.slice(0, TTS_MAX_CHARS)}…` : text;
  const res = await fetch(`${AGENT_URL}/api/tts`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ text: clipped }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`TTS lỗi ${res.status}`);
  }
  return res.blob();
}

export const chatAgentService = {
  streamChat,
  speakText,

  /** Danh sách hội thoại của khách hiện tại (mới nhất trước) */
  listConversations: () =>
    requestJson<{ conversations: Conversation[] }>("/api/conversations").then((r) => r.conversations),

  /** Lịch sử tin nhắn đầy đủ của một hội thoại */
  getMessages: (conversationId: string) =>
    requestJson<{ messages: ConversationMessage[] }>(`/api/conversations/${conversationId}/messages`).then(
      (r) => r.messages
    ),

  /** Đổi tên hội thoại */
  renameConversation: (conversationId: string, title: string) =>
    requestJson<unknown>(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  /** Xóa hội thoại (kèm checkpoint phía agent) */
  deleteConversation: (conversationId: string) =>
    requestJson<unknown>(`/api/conversations/${conversationId}`, { method: "DELETE" }),
};
