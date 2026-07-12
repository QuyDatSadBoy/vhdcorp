"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
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
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const chat = useChat();

  // Con lăn trong panel KHÔNG được cuộn trang phía sau. React gắn wheel listener
  // dạng passive (không preventDefault được) → phải addEventListener passive:false.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // LUÔN chặn default (trang phía sau tuyệt đối không cuộn), rồi tự cuộn
      // scroller gần nhất bên trong panel (message list / sidebar / textarea…).
      e.preventDefault();
      let node = e.target as HTMLElement | null;
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight + 1) {
          node.scrollTop += e.deltaY; // browser tự clamp tại biên
          return;
        }
        node = node.parentElement;
      }
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

  // Esc đóng panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSend = (text: string, image?: string) => void chat.send(text, false, image);
  // Form gen-UI submit → gửi câu lệnh tự nhiên trở lại agent (HITL)
  const handleAction = (message: string) => void chat.send(message);

  return (
    <>
      {/* ─── Nút chat nổi (vị trí bottom-right chính) ─────────────── */}
      <motion.button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? "Đóng trợ lý VHD" : "Mở trợ lý VHD"}
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-linear-to-br from-brand-primary to-brand-accent text-white shadow-xl ring-4 ring-brand-primary/20 animate-cta-glow"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <MessageSquareText className="h-6 w-6" aria-hidden />}
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
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-[10px] font-bold ring-1 ring-white/25"
                aria-hidden
              >
                VHD
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate font-heading text-sm font-bold">Trợ lý VHD</p>
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
