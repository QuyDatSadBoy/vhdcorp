import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";

/**
 * Admin ↔ LÕI DeepAgents (SKILL + MCP server). Đi qua BE NestJS (`/api/agent/deep/*`)
 * như mọi endpoint agent-admin khác: BE giữ X-Admin-Secret, xác thực bằng JWT admin.
 */

export interface DeepSkill {
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  slug: string;
}

export type McpTransport = "streamable_http" | "sse";

export interface McpServer {
  name: string;
  url: string;
  transport: McpTransport;
  enabled: boolean;
}

const BASE = "/agent/deep";

export const agentDeepService = {
  getSkills: async () => (await axios.get<{ skills: DeepSkill[] }>(`${BASE}/skills`)).data,
  saveSkill: async (body: Omit<DeepSkill, "slug">) =>
    (await axios.post<{ skill: DeepSkill; skills: DeepSkill[] }>(`${BASE}/skills`, body)).data,
  deleteSkill: async (slug: string) =>
    (await axios.delete<{ ok: boolean; skills: DeepSkill[] }>(`${BASE}/skills/${encodeURIComponent(slug)}`)).data,
  getMcpServers: async () => (await axios.get<{ servers: McpServer[] }>(`${BASE}/mcp`)).data,
  saveMcpServer: async (body: McpServer) =>
    (await axios.post<{ server: McpServer; servers: McpServer[]; restart_required: boolean }>(`${BASE}/mcp`, body))
      .data,
  deleteMcpServer: async (name: string) =>
    (
      await axios.delete<{ ok: boolean; servers: McpServer[]; restart_required: boolean }>(
        `${BASE}/mcp/${encodeURIComponent(name)}`
      )
    ).data,
};

export const deepSkillsKey = ["agent", "deep", "skills"] as const;
export const deepMcpKey = ["agent", "deep", "mcp"] as const;

export function useDeepSkills() {
  return useQuery({ queryKey: deepSkillsKey, queryFn: agentDeepService.getSkills });
}

export function useSaveDeepSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentDeepService.saveSkill,
    onSuccess: (res) => qc.setQueryData(deepSkillsKey, { skills: res.skills }),
  });
}

export function useDeleteDeepSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentDeepService.deleteSkill,
    onSuccess: (res) => qc.setQueryData(deepSkillsKey, { skills: res.skills }),
  });
}

export function useMcpServers() {
  return useQuery({ queryKey: deepMcpKey, queryFn: agentDeepService.getMcpServers });
}

export function useSaveMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentDeepService.saveMcpServer,
    onSuccess: (res) => qc.setQueryData(deepMcpKey, { servers: res.servers }),
  });
}

export function useDeleteMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentDeepService.deleteMcpServer,
    onSuccess: (res) => qc.setQueryData(deepMcpKey, { servers: res.servers }),
  });
}
