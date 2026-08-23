"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAgent } from "@copilotkit/react-core/v2";
import type { Message } from "@ag-ui/client";
import AgentPlan from "@/components/chat/agent-plan";
import AgentTrace from "@/components/chat/agent-trace";
import MarkdownContent from "@/components/chat/markdown-content";
import type { TodoItem, TodoStatus, ToolRun } from "@/types/chat";

const TODO_STATUSES: TodoStatus[] = ["pending", "in_progress", "completed"];

/** Lọc mảng thô thành TodoItem hợp lệ — state của AG-UI là `any` nên phải tự kiểm kiểu */
function pickTodos(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is TodoItem => {
    if (!t || typeof t !== "object") return false;
    const { content, status } = t as Partial<TodoItem>;
    return typeof content === "string" && TODO_STATUSES.includes(status as TodoStatus);
  });
}

/** Tham số `write_todos` là JSON `{"todos":[…]}`; lúc còn stream thì chưa parse được */
function parseTodoArgs(args: string): TodoItem[] {
  try {
    return pickTodos((JSON.parse(args) as { todos?: unknown }).todos);
  } catch {
    return [];
  }
}

/**
 * Lấy kế hoạch hiện tại của agent.
 *
 * Ưu tiên `state.todos` theo chuẩn AG-UI, nhưng endpoint /agui/chat hiện KHÔNG đưa
 * `todos` vào STATE_SNAPSHOT (chỉ có messages/tools/copilotkit/guardrail_blocked/
 * system_prompt), nên phải lấy từ tham số lần gọi `write_todos` gần nhất. Bản JSON
 * còn dở lúc stream sẽ parse hỏng → giữ nguyên kế hoạch trước đó, không nháy.
 */
function readTodos(state: unknown, messages: Message[]): TodoItem[] {
  if (state && typeof state === "object") {
    const fromState = pickTodos((state as { todos?: unknown }).todos);
    if (fromState.length) return fromState;
  }

  let latest: TodoItem[] = [];
  for (const m of messages) {
    if (m.role !== "assistant" || !m.toolCalls) continue;
    for (const call of m.toolCalls) {
      if (call.function.name !== "write_todos") continue;
      const parsed = parseTodoArgs(call.function.arguments);
      if (parsed.length) latest = parsed;
    }
  }
  return latest;
}

/** content của user có thể là chuỗi hoặc mảng phần tử đa phương tiện — chỉ lấy phần chữ */
function textOf(content: Extract<Message, { role: "user" }>["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

/** Cắt gọn payload tool cho 1 dòng log */
function shorten(value: string, max = 600): string {
  const s = value.trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Nhãn tiếng Việt cho tên tool snake_case */
function toolLabel(name: string): string {
  const map: Record<string, string> = {
    search_products: "Tìm sản phẩm",
    get_product_detail: "Xem chi tiết sản phẩm",
    web_search: "Tra cứu web",
    write_todos: "Lập kế hoạch",
    send_contact_request: "Gửi yêu cầu liên hệ",
    show_product_carousel: "Hiện carousel sản phẩm",
    show_comparison: "Hiện bảng so sánh",
    show_quote_form: "Hiện form báo giá",
  };
  return map[name] ?? name.replace(/_/g, " ");
}

/** Gộp toolCalls (assistant) + kết quả (role "tool") thành log hoạt động */
function deriveRuns(messages: Message[]): ToolRun[] {
  const runs: ToolRun[] = [];
  const byCallId = new Map<string, ToolRun>();

  for (const m of messages) {
    if (m.role === "assistant" && m.toolCalls) {
      for (const call of m.toolCalls) {
        const run: ToolRun = {
          id: call.id,
          name: call.function.name,
          label: toolLabel(call.function.name),
          state: "running",
          input: shorten(call.function.arguments),
        };
        byCallId.set(call.id, run);
        runs.push(run);
      }
    } else if (m.role === "tool") {
      const run = byCallId.get(m.toolCallId);
      if (!run) continue;
      run.state = m.error ? "error" : "ok";
      run.output = shorten(m.error ?? m.content);
    }
  }
  return runs;
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser ? "bg-brand-primary text-white" : "border border-border/70 bg-card text-card-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Chat HEADLESS trên CopilotKit v2: không dùng <CopilotChat/> dựng sẵn, chỉ lấy
 * dữ liệu từ hook `useAgent` rồi tự render bằng đúng phong cách VHD.
 */
export default function HeadlessChat() {
  const { agent, isReady } = useAgent({ agentId: "vhd_chat" });
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // agent.messages đổi TẠI CHỖ khi stream nên không memo hóa — tính lại mỗi lần render
  const messages = agent.messages;
  const todos = readTodos(agent.state, messages);
  const runs = deriveRuns(messages);
  const running = agent.isRunning;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, running]);

  async function send() {
    const text = input.trim();
    if (!text || running || !isReady) return;
    setInput("");
    setError(null);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: text });
    try {
      await agent.runAgent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được tin nhắn");
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-3">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Hỏi trợ lý VHD một câu để bắt đầu — ví dụ “cho tôi xem tấm cao su”.
          </p>
        )}

        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <Bubble key={m.id} role="user">
                <span className="whitespace-pre-wrap">{textOf(m.content)}</span>
              </Bubble>
            );
          }
          if (m.role === "assistant" && m.content) {
            return (
              <Bubble key={m.id} role="assistant">
                <MarkdownContent content={m.content} />
              </Bubble>
            );
          }
          return null;
        })}

        {todos.length > 0 && <AgentPlan items={todos} />}
        {runs.length > 0 && <AgentTrace runs={runs} />}

        {running && messages.at(-1)?.role !== "assistant" && (
          <p className="text-xs text-muted-foreground">Trợ lý đang soạn câu trả lời…</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isReady ? "Nhập câu hỏi cho trợ lý VHD…" : "Đang kết nối trợ lý…"}
          disabled={!isReady}
          aria-label="Nội dung tin nhắn"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || running || !isReady}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-brand-primary text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Gửi"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
