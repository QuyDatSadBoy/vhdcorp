"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatAgentService, streamChat, getChatUserId } from "@/services/chat-agent.service";
import type { Conversation, UiBlock, UiChatMessage } from "@/types/chat";

/** localStorage key nhớ hội thoại đang mở — mở lại panel giữ nguyên */
const ACTIVE_ID_KEY = "vhd_chat_active_id"; // + hậu tố danh tính

const GENERIC_ERROR = "Không kết nối được trợ lý. Vui lòng thử lại.";

/**
 * State machine cho widget chat: danh sách hội thoại, tin nhắn của hội thoại
 * đang mở, streaming SSE, stop/retry, rename/delete.
 */
export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  /** Tên tool đang chạy (tool.start → tool.end) — hiện indicator */
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  /** Message user cuối cùng — dùng cho nút "Thử lại" */
  const lastSentRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  /** Cập nhật content/flag của bubble assistant theo id */
  const patchMessage = useCallback((id: string, patch: Partial<UiChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const persistActiveId = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(`${ACTIVE_ID_KEY}:${getChatUserId()}`, id);
    else window.localStorage.removeItem(`${ACTIVE_ID_KEY}:${getChatUserId()}`);
  }, []);

  /** Nạp lịch sử tin nhắn của một hội thoại từ server */
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const list = await chatAgentService.getMessages(conversationId);
      setMessages(
        list.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
          // Gen-UI đã persist server-side — reload vẫn giữ nguyên carousel/form (§9.2)
          ...(m.ui_blocks?.length
            ? {
                uiBlocks: m.ui_blocks.map((b) => ({
                  id: crypto.randomUUID(),
                  component: b.component,
                  props: b.props,
                })),
              }
            : {}),
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  /** Khởi tạo khi mở panel lần đầu: load list + khôi phục hội thoại đang mở */
  const init = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const list = await chatAgentService.listConversations();
      setConversations(list);
      const savedId =
        typeof window !== "undefined" ? window.localStorage.getItem(`${ACTIVE_ID_KEY}:${getChatUserId()}`) : null;
      if (savedId && list.some((c) => c.id === savedId)) {
        setActiveId(savedId);
        void loadMessages(savedId);
      }
    } catch {
      // Agent offline — vẫn cho mở panel, lỗi sẽ hiện khi gửi message
    }
  }, [loadMessages]);

  /** Dừng stream đang chạy (nút Stop) — giữ lại phần đã nhận */
  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /**
   * Gửi message + stream câu trả lời.
   * `reuseLast=true` (retry): không thêm bubble user mới, chỉ stream lại.
   * `image` (data URL): đính kèm ảnh để tìm sản phẩm (§9.4).
   */
  const send = useCallback(
    async (text: string, reuseLast = false, image?: string | null) => {
      const message = text.trim();
      if (!message || streaming) return;
      lastSentRef.current = message;

      const now = new Date().toISOString();
      const assistantId = crypto.randomUUID();

      setMessages((prev) => {
        const next = reuseLast
          ? prev.filter((m) => !(m.role === "assistant" && m.error)) // bỏ bubble lỗi cũ
          : [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "user" as const,
                content: message,
                createdAt: now,
                ...(image ? { image } : {}),
              },
            ];
        return [...next, { id: assistantId, role: "assistant" as const, content: "", createdAt: now, streaming: true }];
      });

      setStreaming(true);
      setActiveTool(null);
      const controller = new AbortController();
      abortRef.current = controller;

      let content = "";
      let uiBlocks: UiBlock[] = [];
      let streamError: string | null = null;
      let createdConversation = false;

      // Stream mượt: SSE bắn hàng chục delta/giây — patch mỗi token là mỗi lần
      // re-render + re-parse markdown. Gom delta lại, flush tối đa 1 lần/frame.
      let rafId: number | null = null;
      let lastFlush = 0;
      let toolShowing = false;
      const flushContent = () => {
        rafId = null;
        lastFlush = performance.now();
        patchMessage(assistantId, { content });
      };
      // Throttle ~140ms/lần: markdown render từ đầu vẫn mượt (parse ~7 lần/s
      // thay vì mỗi frame), chữ hiện theo nhịp gõ tự nhiên.
      const scheduleFlush = () => {
        if (rafId != null) return;
        const wait = Math.max(0, 140 - (performance.now() - lastFlush));
        rafId = window.setTimeout(flushContent, wait) as unknown as number;
      };

      try {
        await streamChat({
          message,
          conversationId: activeId,
          image,
          signal: controller.signal,
          onEvent: (event) => {
            switch (event.type) {
              case "conversation":
                // Hội thoại mới được tạo ở message đầu → thêm vào sidebar
                createdConversation = true;
                setActiveId(event.id);
                persistActiveId(event.id);
                setConversations((prev) => [
                  { id: event.id, title: event.title, created_at: now, updated_at: now, message_count: 2 },
                  ...prev,
                ]);
                break;
              case "message.delta":
                content += event.content;
                if (toolShowing) {
                  toolShowing = false;
                  setActiveTool(null);
                }
                scheduleFlush();
                break;
              case "tool.start":
                toolShowing = true;
                setActiveTool(event.name);
                break;
              case "tool.end":
                toolShowing = false;
                setActiveTool(null);
                break;
              case "ui":
                // Gen-UI: gắn block vào bubble assistant đang stream (§9.2)
                uiBlocks = [...uiBlocks, { id: crypto.randomUUID(), component: event.component, props: event.props }];
                patchMessage(assistantId, { uiBlocks });
                break;
              case "done":
                // Kèm content: sau khi đổi id, patch cuối theo id cũ sẽ không tìm thấy
                // message nữa — không kèm thì có thể mất chunk cuối chưa kịp flush.
                patchMessage(assistantId, { id: event.message_id, streaming: false, content, finishedLive: true });
                break;
              case "error":
                streamError = event.message || GENERIC_ERROR;
                break;
            }
          },
        });
        if (rafId != null) clearTimeout(rafId);
        if (streamError) {
          patchMessage(assistantId, { streaming: false, error: streamError });
        } else {
          // Flush cuối kèm content — không phụ thuộc frame đã schedule
          patchMessage(assistantId, { streaming: false, content, finishedLive: true });
        }
      } catch (err) {
        if (rafId != null) clearTimeout(rafId);
        if (err instanceof DOMException && err.name === "AbortError") {
          // User bấm Stop — giữ phần đã stream, không coi là lỗi
          patchMessage(assistantId, { streaming: false, content: content || "(đã dừng)" });
        } else {
          patchMessage(assistantId, { streaming: false, error: GENERIC_ERROR });
        }
      } finally {
        setStreaming(false);
        setActiveTool(null);
        abortRef.current = null;
        if (!createdConversation && activeId) {
          // Cập nhật meta hội thoại hiện tại (đưa lên đầu sidebar)
          setConversations((prev) => {
            const cur = prev.find((c) => c.id === activeId);
            if (!cur) return prev;
            const updated = {
              ...cur,
              updated_at: new Date().toISOString(),
              message_count: cur.message_count + 2,
            };
            return [updated, ...prev.filter((c) => c.id !== activeId)];
          });
        }
      }
    },
    [activeId, patchMessage, persistActiveId, streaming]
  );

  /** Gửi lại message cuối sau khi lỗi */
  const retry = useCallback(() => {
    if (lastSentRef.current) void send(lastSentRef.current, true);
  }, [send]);

  /** Chuyển sang hội thoại khác trong sidebar */
  const selectConversation = useCallback(
    (id: string) => {
      if (id === activeId) return;
      abortRef.current?.abort();
      setActiveId(id);
      persistActiveId(id);
      void loadMessages(id);
    },
    [activeId, loadMessages, persistActiveId]
  );

  /** Màn chat trống — KHÔNG gọi API (hội thoại chỉ tạo khi gửi message đầu) */
  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    persistActiveId(null);
    setMessages([]);
  }, [persistActiveId]);

  /** Đổi tên hội thoại (optimistic) */
  const renameConversation = useCallback(async (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: clean } : c)));
    try {
      await chatAgentService.renameConversation(id, clean);
    } catch {
      // Lỗi rename không nghiêm trọng — list sẽ đúng lại ở lần load sau
    }
  }, []);

  /** Xóa hội thoại; nếu đang mở → về màn chat trống */
  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) newChat();
      try {
        await chatAgentService.deleteConversation(id);
      } catch {
        // nuốt lỗi — item đã gỡ khỏi UI
      }
    },
    [activeId, newChat]
  );

  // Hủy stream khi unmount widget
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    conversations,
    activeId,
    messages,
    loadingMessages,
    streaming,
    activeTool,
    init,
    send,
    stop,
    retry,
    selectConversation,
    newChat,
    renameConversation,
    deleteConversation,
  };
}
