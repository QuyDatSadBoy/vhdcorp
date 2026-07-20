"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";
import { cn } from "@/lib/utils";
import ChatInput from "./chat-input";
import ConversationSidebar from "./conversation-sidebar";
import MessageList from "./message-list";
import { useChat } from "./use-chat";

/**
 * Widget chat AI "Trợ lý VHD": nút nổi góc phải-dưới + panel chat kiểu ChatGPT
 * (sidebar hội thoại + khung chat streaming). Desktop popup ~800×620,
 * mobile (<640px) full-screen.
 */
const HINT_KEY = "vhd_chat_hint_seen";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Bong bóng chào lần đầu — chỉ dẫn user biết đây là trợ lý AI */
  const [showHint, setShowHint] = useState(false);
  /** Ảnh mascot AI (fe/public/images/ai-agent.png) — thiếu thì fallback icon robot */
  const [mascotOk, setMascotOk] = useState(true);
  // Tên trợ lý theo brand trong Cài đặt site — đổi tên site là widget đổi theo
  const siteName = useSiteConfigStore((st) => st.config?.brand?.siteName) || "VHD";
  const brandLogo = useSiteConfigStore((s) => s.config?.brand?.logo?.url) || "/images/vhdcorplogo.jpeg";
  // Icon mascot admin cấu hình (Cài đặt site → Brand) — fallback file mặc định
  const assistantIcon = useSiteConfigStore((st) => st.config?.brand?.assistantIcon?.url) || "/images/ai-agent.png";
  const panelRef = useRef<HTMLDivElement>(null);
  const chat = useChat();

  // Con lăn trong panel KHÔNG được cuộn trang phía sau. React gắn wheel listener
  // dạng passive (không preventDefault được) → phải addEventListener passive:false.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Trong scroller (message list / sidebar / textarea): DE TRINH DUYET cuon
      // native - muot, co quan tinh (tu set scrollTop bang JS la nguon giat);
      // overscroll-contain tren scroller da chan cuon lan ra trang phia sau.
      // Chi chan default khi con lan nam NGOAI moi scroller (header, nut...).
      let node = e.target as HTMLElement | null;
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight + 1) return;
        node = node.parentElement;
      }
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  const openPanel = useCallback(() => {
    setOpen(true);
    // Desktop mở sẵn sidebar; mobile ẩn để dành chỗ cho khung chat
    setSidebarOpen(window.matchMedia("(min-width: 640px)").matches);
    void chat.init();
  }, [chat]);

  // Khách lần đầu: desktop TỰ MỞ trợ lý sau 2.5s (thấy ngay câu hỏi mẫu);
  // mobile chỉ hiện bong bóng chào (tự mở full-screen sẽ che mất nội dung).
  useEffect(() => {
    if (typeof window === "undefined" || localStorage.getItem(HINT_KEY)) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      const t = setTimeout(() => {
        localStorage.setItem(HINT_KEY, "1");
        openPanel();
      }, 2500);
      return () => clearTimeout(t);
    }
    const show = setTimeout(() => setShowHint(true), 1500);
    const hide = setTimeout(() => setShowHint(false), 16_500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy 1 lần khi mount
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    if (typeof window !== "undefined") localStorage.setItem(HINT_KEY, "1");
  };

  // Esc đóng panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // useCallback: MessageBubble đã memo — callback ổn định để các bubble cũ không re-render khi stream
  const { send } = chat;
  const handleSend = useCallback((text: string, image?: string) => void send(text, false, image), [send]);
  // Form gen-UI submit → gửi câu lệnh tự nhiên trở lại agent (HITL)
  const handleAction = useCallback((message: string) => void send(message), [send]);

  return (
    <>
      {/* ─── Nút chat nổi (vị trí bottom-right chính) ─────────────── */}
      {/* Bong bóng chào lần đầu — chỉ dẫn user biết có trợ lý AI */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div
            suppressHydrationWarning
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-7 right-24 z-50 w-64 rounded-2xl rounded-br-sm border border-brand-primary/20 bg-background p-3.5 shadow-2xl"
          >
            <button
              type="button"
              onClick={dismissHint}
              aria-label="Đóng gợi ý"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
            >
              <X className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                dismissHint();
                openPanel();
              }}
              className="text-left"
            >
              <p className="text-sm font-bold text-foreground">👋 Chào bạn! Tôi là trợ lý AI của VHD</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Hỏi giá, tìm sản phẩm (kể cả bằng ảnh), đặt hàng hay để lại liên hệ — tôi trả lời ngay 24/7.
              </p>
              <span className="mt-2 inline-block text-xs font-semibold text-brand-primary">Bấm để trò chuyện →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Nhãn nhỏ "Trợ lý AI" luôn hiện cạnh nút (desktop) để user biết chức năng */}
      {!open && (
        <span
          aria-hidden
          className="fixed bottom-10 right-22 z-40 hidden rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-semibold text-background shadow-lg sm:block"
        >
          Trợ lý AI
        </span>
      )}
      <motion.button
        type="button"
        onClick={() => {
          dismissHint();
          return open ? setOpen(false) : openPanel();
        }}
        aria-label={open ? "Đóng trợ lý VHD" : "Mở trợ lý VHD"}
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 grid h-15 w-15 place-items-center rounded-full p-[3px] shadow-xl animate-cta-glow [background:conic-gradient(from_210deg,#F5A623,#1B3A8C_40%,#C8102E_75%,#F5A623)]"
      >
        <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white">
          {open ? (
            <X className="h-6 w-6 text-brand-primary" aria-hidden />
          ) : mascotOk ? (
            // Mascot AI của VHD — thay ảnh tại fe/public/images/ai-agent.png
            // eslint-disable-next-line @next/next/no-img-element -- mascot nhỏ, tự fallback icon
            <img src={assistantIcon} alt="" className="h-full w-full object-cover" onError={() => setMascotOk(false)} />
          ) : (
            <Bot className="h-7 w-7 text-brand-primary" aria-hidden />
          )}
        </span>
        {/* Badge chấm xanh "online" */}
        {!open && (
          <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
          </span>
        )}
      </motion.button>

      {/* ─── Panel chat ────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Trợ lý VHD"
            // Lenis (smooth-scroll) hijack wheel ở tầng window — attribute này bảo nó
            // bỏ qua mọi wheel/touch bắt nguồn trong panel (kết hợp handler ở trên).
            data-lenis-prevent
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            style={{ transformOrigin: "bottom right" }}
            className={cn(
              "fixed z-[60] flex flex-col overflow-hidden bg-background",
              // Mobile: full-screen; Desktop: popup 800×620 neo góc phải-dưới
              "inset-0 sm:inset-auto sm:bottom-24 sm:right-6",
              "sm:h-[min(620px,calc(100dvh-7.5rem))] sm:w-[min(800px,calc(100vw-3rem))]",
              "sm:rounded-2xl sm:border sm:border-border/60 sm:shadow-[0_24px_80px_-16px_rgb(0_0_0/0.35)]"
            )}
          >
            {/* Header: gradient brand + logo + trạng thái online */}
            <div className="flex items-center gap-2.5 bg-linear-to-r from-brand-primary to-brand-accent px-3 py-2.5 text-white">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Ẩn danh sách hội thoại" : "Hiện danh sách hội thoại"}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4.5 w-4.5" aria-hidden />
                ) : (
                  <PanelLeftOpen className="h-4.5 w-4.5" aria-hidden />
                )}
              </button>
              <span
                className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-white/40"
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- logo brand từ config */}
                <img src={brandLogo} alt="" className="h-full w-full object-contain p-0.5" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-heading text-sm font-bold">Trợ lý {siteName}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  AI · trả lời tức thì
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng cửa sổ chat"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4.5 w-4.5" aria-hidden />
              </button>
            </div>

            {/* Body: sidebar + khung chat */}
            <div className="relative flex min-h-0 flex-1">
              {sidebarOpen && (
                <>
                  {/* Backdrop chỉ trên mobile — sidebar là drawer đè lên chat */}
                  <button
                    type="button"
                    aria-label="Đóng danh sách hội thoại"
                    onClick={() => setSidebarOpen(false)}
                    className="absolute inset-0 z-10 bg-black/30 sm:hidden"
                  />
                  <aside className="absolute inset-y-0 left-0 z-20 w-60 shrink-0 border-r border-border/60 bg-background sm:static sm:z-auto sm:bg-muted/25">
                    <ConversationSidebar
                      conversations={chat.conversations}
                      activeId={chat.activeId}
                      onSelect={(id) => {
                        chat.selectConversation(id);
                        // Mobile: chọn xong tự đóng drawer
                        if (!window.matchMedia("(min-width: 640px)").matches) setSidebarOpen(false);
                      }}
                      onNew={() => {
                        chat.newChat();
                        if (!window.matchMedia("(min-width: 640px)").matches) setSidebarOpen(false);
                      }}
                      onRename={(id, title) => void chat.renameConversation(id, title)}
                      onDelete={(id) => void chat.deleteConversation(id)}
                    />
                  </aside>
                </>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <MessageList
                  messages={chat.messages}
                  loading={chat.loadingMessages}
                  activeTool={chat.activeTool}
                  procSteps={chat.procSteps}
                  onRetry={chat.retry}
                  onSelectPrompt={handleSend}
                  onAction={handleAction}
                />
                <ChatInput streaming={chat.streaming} onSend={handleSend} onStop={chat.stop} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
