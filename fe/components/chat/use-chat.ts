"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatAgentService, streamChat, getChatUserId } from "@/services/chat-agent.service";
import { TOOL_STEP_LABELS } from "@/lib/tool-labels";
import type { Conversation, TodoItem, ToolRun, UiBlock, UiChatMessage } from "@/types/chat";

/** localStorage key nhớ hội thoại đang mở — mở lại panel giữ nguyên */
const ACTIVE_ID_KEY = "vhd_chat_active_id"; // + hậu tố danh tính

const GENERIC_ERROR = "Không kết nối được trợ lý. Vui lòng thử lại.";

/** Nhãn tiến trình theo tool — khách thấy VHD "đang làm việc" thật */

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
  /** Kế hoạch nhiều bước agent tự lập (DeepAgents write_todos) — rỗng = ẩn panel */
  const [todos, setTodos] = useState<TodoItem[]>([]);
  /** Log hoạt động chi tiết: từng lần gọi tool + tham số/kết quả (mở ra xem được) */
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);

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
          // Số đo do máy chủ lưu: mở lại hội thoại cũ vẫn thấy thời gian và token.
          // Không có `ttft` trong lịch sử (đó là số đo ở trình duyệt lúc chạy), nên
          // dùng chính thời gian máy chủ ghi cho cả hai chỗ thay vì bỏ trống.
          ...(m.metrics?.total_tokens || m.metrics?.elapsed
            ? {
                metrics: {
                  ttft: 0,
                  total: m.metrics.elapsed ?? 0,
                  chars: m.content.length,
                  inTokens: m.metrics.in_tokens,
                  outTokens: m.metrics.out_tokens,
                  totalTokens: m.metrics.total_tokens,
                  model: m.metrics.model,
                },
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
      // Kế hoạch + log hoạt động thuộc về LƯỢT này → xoá của lượt trước
      setTodos([]);
      setToolRuns([]);
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
      // Số đo hiển thị dưới bong bóng. Đo ở TRÌNH DUYỆT vì đó mới là thứ khách cảm
      // nhận (gồm cả đường truyền), khác với thời gian server tự báo.
      const startedAt = performance.now();
      let firstTokenAt: number | null = null;
      let cachedAnswer = false;
      // Token THẬT + model thực chạy do máy chủ báo trong sự kiện done
      let serverMetrics: Record<string, unknown> | null = null;
      let typewriterResolve: (() => void) | null = null;

      const finalize = () => {
        if (finalized) return;
        finalized = true;
        if (ticker != null) cancelAnimationFrame(ticker);
        // Text xong RỒI mới gắn card — thứ tự tuần tự tuyệt đối
        patchMessage(assistantId, {
          ...(finalMessageId ? { id: finalMessageId } : {}),
          content,
          uiBlocks: uiBlocks.length ? uiBlocks : undefined,
          streaming: false,
          finishedLive: true,
          metrics: {
            ttft: ((firstTokenAt ?? performance.now()) - startedAt) / 1000,
            total: (performance.now() - startedAt) / 1000,
            chars: content.length,
            cached: cachedAnswer,
            inTokens: Number(serverMetrics?.in_tokens) || undefined,
            outTokens: Number(serverMetrics?.out_tokens) || undefined,
            totalTokens: Number(serverMetrics?.total_tokens) || undefined,
            model: (serverMetrics?.model as string) || undefined,
          },
        });
        typewriterResolve?.();
      };

      // Chữ chảy theo NHỊP MÀN HÌNH (requestAnimationFrame) thay vì hẹn giờ 33ms.
      //
      // Đo trước khi sửa: mỗi lần hiện trung bình 21.6 ký tự — chữ nhảy thành cục chứ
      // không chảy. Lý do: bước cũ là backlog/12 nên mạng bắn một cụm 200 ký tự là hiện
      // 17 ký tự một nhịp, và hẹn giờ 33ms lại lệch nhịp vẽ của trình duyệt nên thêm
      // cảm giác rung.
      //
      // Bước nay có TRẦN: tối đa 8 ký tự mỗi khung hình ≈ 480 ký tự/giây ở 60fps —
      // vẫn nhanh hơn tốc độ mô hình sinh chữ nên không bao giờ tụt lại. Chỉ khi tụt
      // hậu rất nhiều (câu lấy từ bộ đệm đổ về cả bài) mới cho nhảy 24 ký tự để bắt
      // kịp, chứ không bắt khách chờ chữ bò từng nhịp.
      const STEP_SMOOTH = 8;
      const STEP_CATCHUP = 24;
      const tick = () => {
        const backlog = content.length - shownChars;
        if (backlog > 0) {
          const cap = backlog > 400 ? STEP_CATCHUP : STEP_SMOOTH;
          const step = Math.min(cap, Math.max(2, Math.ceil(backlog / 10)));
          shownChars = Math.min(content.length, shownChars + step);
          patchMessage(assistantId, { content: content.slice(0, shownChars) });
          ticker = requestAnimationFrame(tick) as unknown as number;
          return;
        }
        if (serverDone) {
          ticker = null;
          finalize();
          return;
        }
        // Hết chữ để hiện nhưng máy chủ chưa xong → vẫn giữ vòng để bắt chữ kế tiếp
        ticker = requestAnimationFrame(tick) as unknown as number;
      };
      const ensureTicker = () => {
        if (ticker == null) ticker = requestAnimationFrame(tick) as unknown as number;
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
                if (firstTokenAt === null) firstTokenAt = performance.now();
                content += event.content;
                setActiveTool(null);
                ensureTicker(); // typewriter bắt đầu chảy chữ
                break;
              case "tool.start": {
                const label = TOOL_STEP_LABELS[event.name] ?? "Đang xử lý yêu cầu…";
                setActiveTool(event.name);
                pushStep(label);
                setToolRuns((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), name: event.name, label, state: "running", input: event.input },
                ]);
                break;
              }
              case "tool.end":
                setActiveTool(null);
                pushStep("Đang tổng hợp & xác minh thông tin…");
                // Đóng dòng ĐANG CHẠY gần nhất của đúng tool đó (nhiều tool có thể
                // chạy song song nên không thể chỉ lấy phần tử cuối)
                setToolRuns((prev) => {
                  const idx = prev.findLastIndex((r) => r.name === event.name && r.state === "running");
                  if (idx < 0) return prev;
                  const next = [...prev];
                  next[idx] = { ...next[idx], state: "ok", output: event.output };
                  return next;
                });
                break;
              case "todo":
                // Danh sách MỚI thay thế toàn bộ danh sách cũ (last-wins)
                setTodos(event.items);
                break;
              case "ui":
                // Card/gợi ý XẾP HÀNG chờ — chỉ gắn sau khi text stream xong
                uiBlocks = [...uiBlocks, { id: crypto.randomUUID(), component: event.component, props: event.props }];
                break;
              case "done":
                finalMessageId = event.message_id;
                cachedAnswer = Boolean((event as { cached?: boolean }).cached);
                serverMetrics = (event as { metrics?: Record<string, unknown> }).metrics ?? null;
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
          if (ticker != null) cancelAnimationFrame(ticker);
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
        if (ticker != null) cancelAnimationFrame(ticker);
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
        if (ticker != null) cancelAnimationFrame(ticker);
        setStreaming(false);
        setActiveTool(null);
        setProcSteps([]);
        // Tool nào còn "running" khi stream kết thúc/bị dừng thì không thể coi là xong
        setToolRuns((prev) =>
          prev.some((r) => r.state === "running")
            ? prev.map((r) => (r.state === "running" ? { ...r, state: "error" as const } : r))
            : prev
        );
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
    todos,
    toolRuns,
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
