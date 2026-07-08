import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";
import type { SiteConfigValue } from "@/types/site-config";

interface SiteConfigEntity {
  id: number;
  key: string;
  value: SiteConfigValue;
  version: number;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
}

interface SiteConfigHistory {
  id: number;
  configId: number;
  snapshot: SiteConfigValue;
  version: number;
  savedBy: number;
  createdAt: string;
}

export const siteConfigKeys = {
  published: (key = "main") => ["site-config", "published", key] as const,
  draft: (key = "main") => ["site-config", "draft", key] as const,
  history: (key = "main") => ["site-config", "history", key] as const,
};

export const siteConfigService = {
  getPublished: (key = "main") =>
    axios.get<{ data: SiteConfigEntity }>("/site-config", { params: { key } }).then(unwrap),
  getDraft: (key = "main") =>
    axios.get<{ data: SiteConfigEntity }>("/site-config/draft", { params: { key } }).then(unwrap),
  saveDraft: (key: string, value: SiteConfigValue) =>
    axios.put<{ data: SiteConfigEntity }>("/site-config/draft", { value }, { params: { key } }).then(unwrap),
  publish: (key = "main") =>
    // BE body parser ở chế độ strict — không gửi body (axios mặc định undefined sẽ không set Content-Type)
    axios.post<{ data: SiteConfigEntity }>("/site-config/publish", undefined, { params: { key } }).then(unwrap),
  history: (key = "main") =>
    axios.get<{ data: SiteConfigHistory[] }>("/site-config/history", { params: { key } }).then(unwrap),
  rollback: (historyId: number) =>
    axios.post<{ data: SiteConfigEntity }>(`/site-config/rollback/${historyId}`).then(unwrap),
};

export function usePublishedSiteConfig(key = "main") {
  return useQuery({
    queryKey: siteConfigKeys.published(key),
    queryFn: () => siteConfigService.getPublished(key),
    staleTime: 60_000,
  });
}

export function useDraftSiteConfig(key = "main") {
  return useQuery({ queryKey: siteConfigKeys.draft(key), queryFn: () => siteConfigService.getDraft(key) });
}

export function useSaveDraftSiteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key = "main", value }: { key?: string; value: SiteConfigValue }) =>
      siteConfigService.saveDraft(key, value),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: siteConfigKeys.draft(vars.key ?? "main") }),
  });
}

export function usePublishSiteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string = "main") => {
      const result = await siteConfigService.publish(key);
      // Trigger Next.js on-demand revalidation để client thấy thay đổi ngay (không chờ ISR 60s).
      try {
        await fetch(
          `/api/revalidate?secret=${encodeURIComponent(process.env.NEXT_PUBLIC_REVALIDATE_SECRET ?? "vhdcorp-revalidate")}&tag=site-config`,
          { method: "POST" }
        );
      } catch {
        /* best-effort: revalidate có thể fail nhưng không nên block publish */
      }
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-config"] }),
  });
}

export function useSiteConfigHistory(key = "main") {
  return useQuery({ queryKey: siteConfigKeys.history(key), queryFn: () => siteConfigService.history(key) });
}
