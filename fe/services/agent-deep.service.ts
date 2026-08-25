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
  /** Kỹ năng viết sẵn trong mã nguồn: chỉ xem, không sửa/xoá qua web */
  builtin?: boolean;
}

/** Chế độ hoạt động của trợ lý — admin đặt phạm vi + luật riêng. */
export interface AgentModeState {
  mode: string;
  label: string;
  hint: string;
  rules: string[];
  modes: { id: string; label: string; hint: string }[];
}

export type McpTransport = "streamable_http" | "sse";

export interface McpServer {
  name: string;
  url: string;
  transport: McpTransport;
  enabled: boolean;
}

const BASE = "/agent/deep";

/**
 * Bóc phong bì của backend.
 *
 * Mọi phản hồi đều được gói thành { statusCode, success, data } bởi interceptor chung.
 * Trước đây file này đọc thẳng `res.data` nên nhận về phong bì chứ không phải nội dung —
 * danh sách kỹ năng và MCP vì thế LUÔN rỗng trên trang quản trị dù server trả đủ.
 */
function body<T>(res: { data: unknown }): T {
  const d = res.data as { data?: T } | T;
  return (d && typeof d === "object" && "data" in (d as object) ? (d as { data: T }).data : (d as T)) as T;
}

export const agentDeepService = {
  getMode: async () => body<AgentModeState>(await axios.get(`${BASE}/mode`)),
  saveMode: async (payload: { mode?: string; rules?: string[] }) =>
    body<AgentModeState>(await axios.post(`${BASE}/mode`, payload)),
  getSkills: async () => body<{ skills: DeepSkill[] }>(await axios.get(`${BASE}/skills`)),
  saveSkill: async (payload: Omit<DeepSkill, "slug">) =>
    body<{ skill: DeepSkill; skills: DeepSkill[] }>(await axios.post(`${BASE}/skills`, payload)),
  deleteSkill: async (slug: string) =>
    body<{ ok: boolean; skills: DeepSkill[] }>(await axios.delete(`${BASE}/skills/${encodeURIComponent(slug)}`)),
  getMcpServers: async () => body<{ servers: McpServer[] }>(await axios.get(`${BASE}/mcp`)),
  saveMcpServer: async (payload: McpServer) =>
    body<{ server: McpServer; servers: McpServer[]; restart_required: boolean }>(
      await axios.post(`${BASE}/mcp`, payload)
    ),
  deleteMcpServer: async (name: string) =>
    body<{ ok: boolean; servers: McpServer[]; restart_required: boolean }>(
      await axios.delete(`${BASE}/mcp/${encodeURIComponent(name)}`)
    ),
};

export const deepModeKey = ["agent", "deep", "mode"] as const;
export const deepSkillsKey = ["agent", "deep", "skills"] as const;
export const deepMcpKey = ["agent", "deep", "mcp"] as const;

export function useAgentMode() {
  return useQuery({ queryKey: deepModeKey, queryFn: agentDeepService.getMode });
}

export function useSaveAgentMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentDeepService.saveMode,
    onSuccess: (data) => qc.setQueryData(deepModeKey, data),
  });
}

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
