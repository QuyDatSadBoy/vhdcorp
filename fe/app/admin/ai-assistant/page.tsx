"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Send, Loader2, Package, FileText, Check } from "lucide-react";
import { aiApi, type AssistantAction } from "@/services/ai.service";
import { useCategories } from "@/services/category.service";
import { useCreateProduct } from "@/services/product.service";
import { useCreatePost } from "@/services/post.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  action?: AssistantAction;
}

export default function AiAssistantPage() {
  const router = useRouter();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const createPost = useCreatePost();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        'Chào bạn 👋 Mình là trợ lý AI của VHD. Nói mình cần gì nhé — ví dụ: "tạo sản phẩm gas lạnh R32" hoặc "viết bài về cách chọn ống đồng". Mình soạn sẵn, bạn duyệt là đăng.',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await aiApi.assistant({
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        categories: (categories ?? []).map((c) => c.name),
      });
      setMessages((m) => [...m, { role: "assistant", content: r.reply, action: r.action }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Xin lỗi, mình gặp lỗi. Bạn thử lại nhé." }]);
    } finally {
      setLoading(false);
    }
  }

  async function approve(idx: number, action: NonNullable<AssistantAction>) {
    try {
      if (action.type === "product") {
        const cat = (categories ?? []).find((c) => c.name === action.data.categoryHint) ?? (categories ?? [])[0];
        if (!cat) {
          toast.error("Chưa có danh mục nào — tạo danh mục trước.");
          return;
        }
        const created = await createProduct.mutateAsync({
          name: action.data.name,
          description: action.data.description,
          price: 0,
          categoryId: cat.id,
          status: "DRAFT",
          images: [],
          metaTitle: action.data.metaTitle,
          metaDesc: action.data.metaDesc,
        } as never);
        setDone((d) => ({ ...d, [idx]: true }));
        toast.success("Đã tạo nháp sản phẩm — mở để thêm ảnh & xuất bản.");
        router.push(`/admin/products/${(created as { id: number }).id}`);
      } else {
        const created = await createPost.mutateAsync({
          title: action.data.title,
          excerpt: action.data.excerpt,
          content: action.data.content,
          status: "DRAFT",
          metaTitle: action.data.metaTitle,
          metaDesc: action.data.metaDesc,
        } as never);
        setDone((d) => ({ ...d, [idx]: true }));
        toast.success("Đã tạo nháp bài viết — mở để thêm ảnh bìa & xuất bản.");
        router.push(`/admin/posts/${(created as { id: number }).id}`);
      }
    } catch {
      toast.error("Không tạo được nháp, thử lại.");
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold">Trợ lý AI</h1>
          <p className="text-xs text-muted-foreground">Chat để soạn nháp sản phẩm / bài viết — bạn duyệt là đăng.</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-muted/20 p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={
                  "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " +
                  (m.role === "user" ? "bg-brand-primary text-white" : "bg-card border")
                }
              >
                {m.content}
              </div>
              {m.action && (
                <Card className="border-brand-primary/30">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brand-primary">
                      {m.action.type === "product" ? <Package className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      {m.action.type === "product" ? "Nháp sản phẩm" : "Nháp bài viết"}
                    </div>
                    <p className="text-sm font-medium">
                      {m.action.type === "product" ? m.action.data.name : m.action.data.title}
                    </p>
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {m.action.type === "product" ? m.action.data.description : m.action.data.excerpt}
                    </p>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={done[i] || createProduct.isPending || createPost.isPending}
                      onClick={() => approve(i, m.action as NonNullable<AssistantAction>)}
                    >
                      <Check className="h-4 w-4" /> {done[i] ? "Đã tạo nháp" : "Duyệt & tạo nháp"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Trợ lý đang soạn…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Vd: "tạo sản phẩm van điện từ" hoặc "viết bài về bảo ôn cách nhiệt"'
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} className="gap-1.5">
          <Send className="h-4 w-4" /> Gửi
        </Button>
      </form>
    </div>
  );
}
