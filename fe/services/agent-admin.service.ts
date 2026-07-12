import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";

/**
 * Admin ↔ AI Agent qua BE proxy (/api/agent/*, JWT admin).
 * Secret của agent chỉ nằm ở BE — FE không bao giờ thấy.
 */
export const agentAdminService = {
  getKnowledge: () => axios.get<{ data: { content: string } }>("/agent/knowledge").then(unwrap),
  saveKnowledge: (markdown: string) =>
    axios.put<{ data: { ok: boolean; chars: number } }>("/agent/knowledge", { markdown }).then(unwrap),
};

export const agentKnowledgeKey = ["agent", "knowledge"] as const;

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
