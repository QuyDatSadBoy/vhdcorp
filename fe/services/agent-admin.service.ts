import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";

/**
 * Admin ↔ AI Agent qua BE proxy (/api/agent/*, JWT admin).
 * Secret của agent chỉ nằm ở BE — FE không bao giờ thấy.
 */
export interface ChatLimits {
  enabled: boolean;
  per_ip_per_min: number;
  per_ip_per_hour: number;
  per_ip_per_day: number;
  global_per_day: number;
  blocked_ips: string[];
  price_per_1m_input_vnd: number;
  price_per_1m_output_vnd: number;
}

export interface UsageDay {
  date: string;
  requests: number;
  blocked: number;
  input_tokens: number;
  output_tokens: number;
  cost_vnd: number;
}
export interface UsageStats {
  series: UsageDay[];
  today: UsageDay;
  total: UsageDay;
  price_per_1m_input_vnd: number;
  price_per_1m_output_vnd: number;
  days: number;
}

export const agentAdminService = {
  getKnowledge: () => axios.get<{ data: { content: string } }>("/agent/knowledge").then(unwrap),
  saveKnowledge: (markdown: string) =>
    axios.put<{ data: { ok: boolean; chars: number } }>("/agent/knowledge", { markdown }).then(unwrap),
  getChatLimits: () => axios.get<{ data: ChatLimits }>("/agent/chat-limits").then(unwrap),
  saveChatLimits: (body: Partial<ChatLimits>) =>
    axios.put<{ data: ChatLimits }>("/agent/chat-limits", body).then(unwrap),
  getUsage: (days = 30) => axios.get<{ data: UsageStats }>("/agent/usage", { params: { days } }).then(unwrap),
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

export function useChatLimits() {
  return useQuery({ queryKey: agentChatLimitsKey, queryFn: agentAdminService.getChatLimits });
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
