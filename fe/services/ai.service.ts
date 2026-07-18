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

export const aiApi = {
  productDescription: (body: { images?: string[]; prompt?: string; name?: string }) =>
    axios.post("/agent/ai/product-description", body, { timeout: 70_000 }).then((r) => pick<ProductAIResult>(r)),
  postDraft: (body: { idea?: string; images?: string[] }) =>
    axios.post("/agent/ai/post-draft", body, { timeout: 70_000 }).then((r) => pick<PostAIResult>(r)),
  assistant: (body: { messages: { role: string; content: string }[]; categories?: string[] }) =>
    axios.post("/agent/ai/assistant", body, { timeout: 70_000 }).then((r) => pick<AssistantResult>(r)),
};
