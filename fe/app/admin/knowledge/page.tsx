"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
import { toast } from "sonner";
import { Bot, Code2, Loader2, Save, Sparkles } from "lucide-react";
import { useAgentKnowledge, useSaveAgentKnowledge } from "@/services/agent-admin.service";
import { RichEditor } from "@/components/admin/rich-editor";
import { AiDashboard } from "@/components/admin/ai-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Markdown → HTML cho Tiptap (marked sync mode) */
function mdToHtml(md: string): string {
  return marked.parse(md, { async: false });
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  hr: "---",
});

type Mode = "visual" | "markdown";

/**
 * Trang "Kiến thức trợ lý AI" — admin soạn knowledge.md bằng WYSIWYG (Tiptap,
 * như soạn bài viết) hoặc Markdown thô. Lưu xong agent áp dụng NGAY, không cần restart.
 */
export default function AdminKnowledgePage() {
  const { data, isLoading, isError } = useAgentKnowledge();
  const save = useSaveAgentKnowledge();

  const [mode, setMode] = useState<Mode>("visual");
  const [html, setHtml] = useState("");
  const [raw, setRaw] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Nạp nội dung server 1 lần (không ghi đè khi admin đang gõ)
  useEffect(() => {
    if (loaded || data?.content === undefined) return;
    setRaw(data.content);
    setHtml(mdToHtml(data.content));
    setLoaded(true);
  }, [data, loaded]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "markdown") setRaw(turndown.turndown(html));
    else setHtml(mdToHtml(raw));
    setMode(next);
  };

  const markdownToSave = useMemo(() => (mode === "visual" ? turndown.turndown(html) : raw), [mode, html, raw]);

  const onSave = async () => {
    try {
      const res = await save.mutateAsync(markdownToSave);
      toast.success(`Đã lưu kiến thức (${res.chars.toLocaleString("vi-VN")} ký tự) — trợ lý AI dùng ngay.`);
    } catch {
      toast.error("Không lưu được — kiểm tra AI Agent (cổng 8001) đang chạy.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-brand-primary" />
            Kiến thức trợ lý AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Giờ mở cửa, địa chỉ, chính sách đổi trả, vận chuyển… — trợ lý dùng nội dung này để trả lời khách. Lưu xong
            áp dụng <b>ngay lập tức</b>, không cần khởi động lại.
          </p>
        </div>
        <Button onClick={onSave} disabled={save.isPending || !loaded}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu kiến thức
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
            <ModeButton active={mode === "visual"} onClick={() => switchMode("visual")}>
              <Sparkles className="h-3.5 w-3.5" /> Soạn thảo trực quan
            </ModeButton>
            <ModeButton active={mode === "markdown"} onClick={() => switchMode("markdown")}>
              <Code2 className="h-3.5 w-3.5" /> Markdown thô
            </ModeButton>
          </div>

          {isLoading && !loaded ? (
            <div className="flex h-80 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải kiến thức…
            </div>
          ) : isError && !loaded ? (
            <div className="flex h-80 items-center justify-center text-sm text-destructive">
              Không kết nối được AI Agent — kiểm tra service cổng 8001 rồi tải lại trang.
            </div>
          ) : mode === "visual" ? (
            <RichEditor
              value={html}
              onChange={setHtml}
              placeholder="Nhập thông tin công ty…"
              uploadFolder="knowledge"
            />
          ) : (
            <Textarea
              rows={24}
              className="font-mono text-xs"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="# Thông tin công ty..."
            />
          )}

          <p className="text-xs text-muted-foreground">
            Mẹo: dùng tiêu đề <code>##</code> cho từng chủ đề (Giờ mở cửa, Chính sách đổi trả…) — trợ lý tra cứu theo
            từng mục nên càng rõ ràng càng trả lời chính xác. Chế độ Markdown thô giữ nguyên 100% định dạng gốc của file{" "}
            <code>agent/data/knowledge.md</code>.
          </p>
        </CardContent>
      </Card>
      <AiDashboard />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
