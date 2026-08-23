import axios from "@/lib/axios";

// AI trợ lý admin — gọi qua BE (BE giữ secret + proxy sang agent Gemini).
type ProductAIResult = { name?: string; description?: string; metaTitle?: string; metaDesc?: string };
type PostAIResult = { title?: string; excerpt?: string; content?: string; metaTitle?: string; metaDesc?: string };

function pick<T>(r: { data?: unknown }): T {
  const d = r.data as { data?: T } | T;
  return (d && typeof d === "object" && "data" in (d as object) ? (d as { data: T }).data : (d as T)) ?? ({} as T);
}

export type AssistantAction =
  | {
      type: "product";
      data: { name: string; description: string; categoryHint?: string; metaTitle?: string; metaDesc?: string };
    }
  | { type: "post"; data: { title: string; excerpt?: string; content: string; metaTitle?: string; metaDesc?: string } }
  | null;
type AssistantResult = { reply: string; action: AssistantAction };

export interface AssistantTodo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export type AssistantStreamEvent =
  | { type: "message.delta"; content: string }
  | { type: "tool.start"; name: string; input?: string }
  | { type: "tool.end"; name: string; output?: string }
  | { type: "todo"; items: AssistantTodo[] }
  | { type: "done"; reply?: string }
  | { type: "error"; message: string };

export const aiApi = {
  productDescription: (body: { images?: string[]; prompt?: string; name?: string }) =>
    axios.post("/agent/ai/product-description", body, { timeout: 70_000 }).then((r) => pick<ProductAIResult>(r)),
  postDraft: (body: { idea?: string; images?: string[] }) =>
    axios.post("/agent/ai/post-draft", body, { timeout: 70_000 }).then((r) => pick<PostAIResult>(r)),
  assistant: (body: { messages: { role: string; content: string }[]; categories?: string[] }) =>
    axios.post("/agent/ai/assistant", body, { timeout: 70_000 }).then((r) => pick<AssistantResult>(r)),

  /**
   * Như assistant nhưng đọc dần luồng SSE: trang quản trị hiện chữ gõ dần, log công cụ
   * và bảng kế hoạch giống khung chat của khách.
   *
   * Dùng fetch chứ không axios vì axios trong trình duyệt gom hết phản hồi rồi mới trả
   * — đúng thứ phải tránh khi mục đích là hiện dần. Gọi qua backend (không gọi thẳng
   * agent) để khoá admin không lọt xuống client.
   */
  assistantStream: async (
    body: { messages: { role: string; content: string }[]; categories?: string[] },
    onEvent: (e: AssistantStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const call = () =>
      fetch(`${axios.defaults.baseURL ?? ""}/agent/ai/assistant/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          // Phiên admin và phiên khách dùng hai bộ cookie riêng; backend chọn bộ nào
          // theo header này. Thiếu nó thì request bị coi là chưa đăng nhập (401).
          "X-Session-Scope": "admin",
        },
        credentials: "include",
        body: JSON.stringify(body),
        signal,
      });

    let res = await call();
    if (res.status === 401) {
      // Vé hết hạn: làm mới rồi gọi lại đúng một lần (axios tự làm việc này qua
      // interceptor, còn fetch thì phải tự lo).
      await axios.post("/auth/refresh").catch(() => undefined);
      res = await call();
    }
    if (!res.ok || !res.body) throw new Error(`Trợ lý AI lỗi (HTTP ${res.status})`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE ngăn cách bằng dòng trống; giữ lại phần cuối vì có thể là gói chưa đủ
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          onEvent(JSON.parse(line.slice(5).trim()) as AssistantStreamEvent);
        } catch {
          /* gói lỗi định dạng thì bỏ, không làm đứt cả luồng */
        }
      }
    }
  },
};
