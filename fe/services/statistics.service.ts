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

export const statisticsService = {
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
