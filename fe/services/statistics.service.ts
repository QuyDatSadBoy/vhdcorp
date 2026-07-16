import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";

export interface StatsOverview {
  products: number;
  posts: number;
  users: number;
  reviews: number;
  pendingReviews: number;
}

export interface StatsTimeseriesPoint {
  date: string;
  products: number;
  posts: number;
  users: number;
}

export interface StatsCategoryBreakdown {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface StatsTopProduct {
  id: number;
  name: string;
  slug: string;
  stock: number;
  reviews: number;
}

export const statisticsKeys = {
  overview: ["statistics", "overview"] as const,
  timeseries: (days: number) => ["statistics", "timeseries", days] as const,
  categoriesBreakdown: ["statistics", "categories-breakdown"] as const,
  topProducts: (limit: number) => ["statistics", "top-products", limit] as const,
};

export interface ViewsPoint {
  date: string;
  views: number;
}
export interface TopViewedRow {
  productId: number;
  name: string;
  views: number;
}

export const statisticsService = {
  views: (days = 30) => axios.get<{ data: ViewsPoint[] }>("/statistics/views", { params: { days } }).then(unwrap),
  topViewed: (days = 30) =>
    axios.get<{ data: TopViewedRow[] }>("/statistics/top-viewed", { params: { days } }).then(unwrap),
  overview: () => axios.get<{ data: StatsOverview }>("/statistics/overview").then(unwrap),
  timeseries: (days: number) =>
    axios.get<{ data: StatsTimeseriesPoint[] }>("/statistics/timeseries", { params: { days } }).then(unwrap),
  categoriesBreakdown: () =>
    axios.get<{ data: StatsCategoryBreakdown[] }>("/statistics/categories-breakdown").then(unwrap),
  topProducts: (limit: number) =>
    axios.get<{ data: StatsTopProduct[] }>("/statistics/top-products", { params: { limit } }).then(unwrap),
};

export function useStatsOverview() {
  return useQuery({ queryKey: statisticsKeys.overview, queryFn: statisticsService.overview });
}

export function useStatsTimeseries(days = 7) {
  return useQuery({
    queryKey: statisticsKeys.timeseries(days),
    queryFn: () => statisticsService.timeseries(days),
  });
}

export function useStatsCategoriesBreakdown() {
  return useQuery({
    queryKey: statisticsKeys.categoriesBreakdown,
    queryFn: statisticsService.categoriesBreakdown,
    staleTime: 60_000,
  });
}

export function useStatsTopProducts(limit = 6) {
  return useQuery({
    queryKey: statisticsKeys.topProducts(limit),
    queryFn: () => statisticsService.topProducts(limit),
    staleTime: 60_000,
  });
}

export function useViewsStats(days = 30) {
  return useQuery({ queryKey: ["statistics", "views", days], queryFn: () => statisticsService.views(days) });
}

export function useTopViewedStats(days = 30) {
  return useQuery({ queryKey: ["statistics", "top-viewed", days], queryFn: () => statisticsService.topViewed(days) });
}

/** Tải file CSV báo cáo (đi qua axios để kèm cookie JWT) */
export async function downloadStatsCsv(type: "views" | "top-viewed" | "contacts" | "products" | "orders") {
  const res = await axios.get<string>("/statistics/export", {
    params: { type },
    responseType: "text",
    transformResponse: [(d) => d],
  });
  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bao-cao-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Xuất báo cáo PDF: mở cửa sổ báo cáo brand (logo + bảng số liệu) và gọi hộp thoại in
 * — admin chọn "Save as PDF". Không cần thư viện ngoài, tiếng Việt chuẩn 100%.
 */
export async function printStatsPdf() {
  const [views, topViewed] = await Promise.all([statisticsService.views(30), statisticsService.topViewed(30)]);
  const totalViews = views.reduce((s, v) => s + v.views, 0);
  const today = new Date().toLocaleDateString("vi-VN");
  const rows = (arr: { date?: string; name?: string; views: number }[]) =>
    arr
      .map(
        (r) =>
          `<tr><td style="padding:8px 12px;border:1px solid #e2e6f0;">${r.date ?? r.name}</td><td style="padding:8px 12px;border:1px solid #e2e6f0;text-align:right;font-weight:600;">${r.views}</td></tr>`
      )
      .join("");
  const empty =
    '<tr><td colspan="2" style="padding:12px;border:1px solid #e2e6f0;color:#6b7280;">Chưa có dữ liệu</td></tr>';
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo VHD Corp — ${today}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:32px;} h1{color:#1B3A8C;} table{border-collapse:collapse;width:100%;margin:12px 0 28px;} th{background:#1B3A8C;color:#fff;padding:10px 12px;text-align:left;} @media print{button{display:none}}</style></head><body>
<div style="display:flex;align-items:center;gap:16px;border-bottom:3px solid #F5A623;padding-bottom:16px;">
  <img src="${location.origin}/images/vhdcorplogo.jpeg" width="64" height="64" style="border-radius:12px;object-fit:contain;background:#fff;" />
  <div><h1 style="margin:0;">BÁO CÁO TRACKING — VHD Corp</h1><p style="margin:4px 0 0;color:#6b7280;">Ngày xuất: ${today} · Tổng lượt xem 30 ngày: <b>${totalViews}</b></p></div>
</div>
<h2 style="color:#1B3A8C;">1. Lượt xem sản phẩm theo ngày (30 ngày)</h2>
<table><tr><th>Ngày</th><th style="text-align:right;">Lượt xem</th></tr>${rows(views) || empty}</table>
<h2 style="color:#1B3A8C;">2. Top sản phẩm được xem nhiều nhất</h2>
<table><tr><th>Sản phẩm</th><th style="text-align:right;">Lượt xem</th></tr>${rows(topViewed) || empty}</table>
<p style="color:#8a93a6;font-size:12px;">© ${new Date().getFullYear()} VHD Corp — Báo cáo tạo tự động từ trang quản trị.</p>
<button onclick="window.print()" style="padding:10px 24px;background:#1B3A8C;color:#fff;border:0;border-radius:8px;font-size:14px;cursor:pointer;">🖨 In / Lưu PDF</button>
<script>setTimeout(()=>window.print(),400)</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
