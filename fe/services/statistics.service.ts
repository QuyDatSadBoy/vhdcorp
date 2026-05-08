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

export const statisticsKeys = {
  overview: ["statistics", "overview"] as const,
  timeseries: (days: number) => ["statistics", "timeseries", days] as const,
};

export const statisticsService = {
  overview: () => axios.get<{ data: StatsOverview }>("/statistics/overview").then(unwrap),
  timeseries: (days: number) =>
    axios
      .get<{ data: StatsTimeseriesPoint[] }>("/statistics/timeseries", { params: { days } })
      .then(unwrap),
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
