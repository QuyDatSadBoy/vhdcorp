"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessagesSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/chat";

/** Thời gian tương đối tiếng Việt ("vừa xong", "5 phút trước"…) */
function relativeTimeVi(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(diffSec) || diffSec < 60) return "vừa xong";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Sidebar danh sách hội thoại (như ChatGPT): chọn, tạo mới, rename inline,
 * xóa với confirm nhỏ. Hover mới hiện nút thao tác.
 */
export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  /** id đang rename + nội dung draft */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  /** id đang chờ confirm xóa */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input khi bắt đầu rename
  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const commitRename = () => {
    if (editingId && draft.trim()) onRename(editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-2.5">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-primary/25 bg-brand-primary/5 px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:border-brand-accent hover:bg-brand-accent/10 dark:border-border dark:bg-muted/60 dark:text-foreground dark:hover:border-brand-accent"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Cuộc trò chuyện mới
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/40" aria-hidden />
            <p className="text-xs font-medium text-muted-foreground">Chưa có hội thoại nào</p>
            <p className="text-[11px] text-muted-foreground/70">Gửi tin nhắn đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              const isEditing = editingId === c.id;
              const isConfirming = confirmDeleteId === c.id;
              return (
                <li key={c.id} className="group relative">
                  {isEditing ? (
                    // Rename inline: Enter/blur lưu, Escape hủy
                    <div className="rounded-lg border border-brand-accent bg-background px-2 py-1.5">
                      <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        aria-label="Tên hội thoại"
                        className="w-full bg-transparent text-xs font-medium text-foreground outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                        isActive ? "bg-brand-primary/10 dark:bg-brand-accent/15" : "hover:bg-muted/70"
                      )}
                    >
                      <span
                        className={cn(
                          "w-full truncate pr-10 text-xs font-medium",
                          isActive ? "text-brand-primary dark:text-brand-accent" : "text-foreground"
                        )}
                      >
                        {c.title || "Hội thoại mới"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">{relativeTimeVi(c.updated_at)}</span>
                    </button>
                  )}

                  {/* Nút thao tác — hiện khi hover (hoặc đang confirm xóa) */}
                  {!isEditing && (
                    <div
                      className={cn(
                        "absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-background/90 p-0.5 shadow-sm backdrop-blur transition-opacity",
                        isConfirming ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      )}
                    >
                      {isConfirming ? (
                        <>
                          <span className="px-1 text-[10px] font-semibold text-destructive">Xóa?</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              onDelete(c.id);
                            }}
                            aria-label="Xác nhận xóa"
                            className="grid h-6 w-6 place-items-center rounded text-destructive hover:bg-destructive/10"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            aria-label="Hủy xóa"
                            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(c.id);
                              setDraft(c.title);
                            }}
                            aria-label={`Đổi tên hội thoại ${c.title}`}
                            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(c.id)}
                            aria-label={`Xóa hội thoại ${c.title}`}
                            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
