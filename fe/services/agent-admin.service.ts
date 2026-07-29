import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";

/**
 * Admin ↔ AI Agent qua BE proxy (/api/agent/*, JWT admin).
 * Secret của agent chỉ nằm ở BE — FE không bao giờ thấy.
 */
export interface ModelPrice {
  in: number;
  out: number;
}
export interface ChatLimits {
  enabled: boolean;
  per_ip_per_min: number;
  per_ip_per_hour: number;
  per_ip_per_day: number;
  global_per_day: number;
  blocked_ips: string[];
  usd_to_vnd: number;
  model_prices: Record<string, ModelPrice>;
  daily_budget_usd: number;
  monthly_budget_usd: number;
  currency: "vnd" | "usd";
  /** Cache ngữ nghĩa: bật/tắt + ngưỡng tương đồng (0.5–0.999). */
  cache_enabled?: boolean;
  cache_similarity?: number;
  /** Model đang dùng (chính + dự phòng) — server trả về để UI chỉ hiện đúng model này. */
  models?: string[];
  /** Giá gốc mặc định theo bảng giá Google — UI điền sẵn để admin không phải gõ tay. */
  default_model_prices?: Record<string, ModelPrice>;
}

export interface UsageDay {
  date: string;
  requests: number;
  blocked: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_vnd: number;
}
export interface ModelUsage {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_vnd: number;
  price_in_usd: number;
  price_out_usd: number;
}
export interface HourUsage {
  hour: number;
  requests: number;
  tokens: number;
  cost_usd: number;
  cost_vnd: number;
}
export interface CacheStats {
  enabled: boolean;
  similarity: number;
  entries: number;
  hits: number;
  misses: number;
  hit_rate: number;
  saved_tokens: number;
}
export interface UsageStats {
  series: UsageDay[];
  today: UsageDay;
  today_hours: HourUsage[];
  total: UsageDay;
  by_model: ModelUsage[];
  usd_to_vnd: number;
  days: number;
  spend_today_usd: number;
  spend_month_usd: number;
  daily_budget_usd: number;
  monthly_budget_usd: number;
  currency: "vnd" | "usd";
  cache?: CacheStats;
}
export interface TopIp {
  ip: string;
  requests: number;
  blocked: number;
  is_blocked: boolean;
}

export const agentAdminService = {
  getKnowledge: () => axios.get<{ data: { content: string } }>("/agent/knowledge").then(unwrap),
  saveKnowledge: (markdown: string) =>
    axios.put<{ data: { ok: boolean; chars: number } }>("/agent/knowledge", { markdown }).then(unwrap),
  getChatLimits: () => axios.get<{ data: ChatLimits }>("/agent/chat-limits").then(unwrap),
  saveChatLimits: (body: Partial<ChatLimits>) =>
    axios.put<{ data: ChatLimits }>("/agent/chat-limits", body).then(unwrap),
  getUsage: (days = 30) => axios.get<{ data: UsageStats }>("/agent/usage", { params: { days } }).then(unwrap),
  getTopIps: (limit = 15) =>
    axios.get<{ data: { ips: TopIp[] } }>("/agent/top-ips", { params: { limit } }).then(unwrap),
  clearCache: () => axios.post<{ data: { ok: boolean } }>("/agent/cache/clear").then(unwrap),
};

export const agentKnowledgeKey = ["agent", "knowledge"] as const;
export const agentChatLimitsKey = ["agent", "chat-limits"] as const;
export const agentUsageKey = ["agent", "usage"] as const;

export function useAgentUsage(days = 30) {
  return useQuery({
    queryKey: [...agentUsageKey, days],
    queryFn: () => agentAdminService.getUsage(days),
    refetchInterval: 30_000,
  });
}

export const agentTopIpsKey = ["agent", "top-ips"] as const;
export function useTopIps(limit = 15) {
  return useQuery({
    queryKey: [...agentTopIpsKey, limit],
    queryFn: () => agentAdminService.getTopIps(limit),
    refetchInterval: 30_000,
  });
}

export function useChatLimits() {
  return useQuery({ queryKey: agentChatLimitsKey, queryFn: agentAdminService.getChatLimits });
}

export function useClearCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentAdminService.clearCache,
    onSuccess: () => void qc.invalidateQueries({ queryKey: agentUsageKey }),
  });
}

export function useSaveChatLimits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentAdminService.saveChatLimits,
    onSuccess: () => void qc.invalidateQueries({ queryKey: agentChatLimitsKey }),
  });
}

export function useAgentKnowledge() {
  return useQuery({ queryKey: agentKnowledgeKey, queryFn: agentAdminService.getKnowledge });
}

export function useSaveAgentKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentAdminService.saveKnowledge,
    onSuccess: () => void qc.invalidateQueries({ queryKey: agentKnowledgeKey }),
  });
}
