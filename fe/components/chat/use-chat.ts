"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatAgentService, streamChat, getChatUserId } from "@/services/chat-agent.service";
import type { Conversation, UiBlock, UiChatMessage } from "@/types/chat";

/** localStorage key nhớ hội thoại đang mở — mở lại panel giữ nguyên */
const ACTIVE_ID_KEY = "vhd_chat_active_id"; // + hậu tố danh tính

const GENERIC_ERROR = "Không kết nối được trợ lý. Vui lòng thử lại.";

/** Nhãn tiến trình theo tool — khách thấy VHD "đang làm việc" thật */
const TOOL_STEP_LABELS: Record<string, string> = {
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
};

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
  /** Log tiến trình sống động ("Đang tìm kiếm trong kho…") — hiện khi chưa có chữ */
  const [procSteps, setProcSteps] = useState<{ label: string; done: boolean }[]>([]);

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
      // Bước đầu tiên của log tiến trình — hiện ngay khi gửi
      setProcSteps([{ label: "Đã tiếp nhận, đang phân tích yêu cầu…", done: false }]);
      const controller = new AbortController();
      abortRef.current = controller;

      let content = ""; // toàn bộ chữ đã NHẬN từ server (target của typewriter)
      let shownChars = 0; // số ký tự đã HIỂN THỊ
      let uiBlocks: UiBlock[] = []; // card/gợi ý — CHỜ text xong mới gắn (tuần tự)
      let streamError: string | null = null;
      let createdConversation = false;
      let serverDone = false;
      let finalized = false;
      let finalMessageId: string | null = null;
      let ticker: number | null = null;
      let typewriterResolve: (() => void) | null = null;

      const finalize = () => {
        if (finalized) return;
        finalized = true;
        if (ticker != null) clearInterval(ticker);
        // Text xong RỒI mới gắn card — thứ tự tuần tự tuyệt đối
        patchMessage(assistantId, {
          ...(finalMessageId ? { id: finalMessageId } : {}),
          content,
          uiBlocks: uiBlocks.length ? uiBlocks : undefined,
          streaming: false,
          finishedLive: true,
        });
        typewriterResolve?.();
      };

      // Typewriter ~30fps: hiển thị đuổi theo target với bước thích ứng —
      // chữ chảy đều mượt bất kể mạng bắn delta theo cụm.
      const tick = () => {
        const backlog = content.length - shownChars;
        if (backlog > 0) {
          shownChars = Math.min(content.length, shownChars + Math.max(2, Math.ceil(backlog / 12)));
          patchMessage(assistantId, { content: content.slice(0, shownChars) });
        } else if (serverDone) {
          finalize();
        }
      };
      const ensureTicker = () => {
        if (ticker == null) ticker = window.setInterval(tick, 33) as unknown as number;
      };
      /** Đánh dấu bước hiện tại xong + thêm bước mới vào log tiến trình */
      const pushStep = (label: string) => {
        setProcSteps((prev) => [...prev.map((st) => ({ ...st, done: true })), { label, done: false }]);
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
                setActiveTool(null);
                ensureTicker(); // typewriter bắt đầu chảy chữ
                break;
              case "tool.start":
                setActiveTool(event.name);
                pushStep(TOOL_STEP_LABELS[event.name] ?? "Đang xử lý yêu cầu…");
                break;
              case "tool.end":
                setActiveTool(null);
                pushStep("Đang tổng hợp & xác minh thông tin…");
                break;
              case "ui":
                // Card/gợi ý XẾP HÀNG chờ — chỉ gắn sau khi text stream xong
                uiBlocks = [...uiBlocks, { id: crypto.randomUUID(), component: event.component, props: event.props }];
                break;
              case "done":
                finalMessageId = event.message_id;
                serverDone = true;
                // Không có chữ (vd guardrail) → chốt luôn; có chữ → typewriter chảy nốt rồi tự finalize
                if (content.length === 0 || shownChars >= content.length) finalize();
                else ensureTicker();
                break;
              case "error":
                streamError = event.message || GENERIC_ERROR;
                break;
            }
          },
        });
        if (streamError) {
          if (ticker != null) clearInterval(ticker);
          finalized = true;
          patchMessage(assistantId, { streaming: false, error: streamError });
        } else {
          serverDone = true;
          if (content.length === 0 || shownChars >= content.length) {
            finalize();
          } else {
            // Chờ typewriter chảy nốt (tối đa 6s an toàn) rồi finalize gắn card
            ensureTicker();
            await new Promise<void>((resolve) => {
              typewriterResolve = resolve;
              window.setTimeout(() => {
                shownChars = content.length;
                finalize();
              }, 6000);
            });
          }
        }
      } catch (err) {
        if (ticker != null) clearInterval(ticker);
        finalized = true;
        if (err instanceof DOMException && err.name === "AbortError") {
          // User bấm Stop — giữ phần đã stream, không coi là lỗi
          patchMessage(assistantId, {
            streaming: false,
            content: content || "(đã dừng)",
            uiBlocks: uiBlocks.length ? uiBlocks : undefined,
          });
        } else {
          patchMessage(assistantId, { streaming: false, error: GENERIC_ERROR });
        }
      } finally {
        if (ticker != null) clearInterval(ticker);
        setStreaming(false);
        setActiveTool(null);
        setProcSteps([]);
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
    procSteps,
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
