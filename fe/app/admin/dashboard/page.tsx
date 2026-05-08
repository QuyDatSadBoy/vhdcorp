"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, FileText, Users, Star, TrendingUp, FolderTree } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useAdminProducts } from "@/services/product.service";
import { useAdminPosts } from "@/services/post.service";
import { useAdminUsers } from "@/services/user.service";
import { useAdminReviews } from "@/services/review.service";
import { useCategories } from "@/services/category.service";
import { useStatsTimeseries, type StatsTimeseriesPoint } from "@/services/statistics.service";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Range = 7 | 30;

function formatDay(iso: string, range: Range) {
  const d = new Date(iso);
  if (range === 7) return d.toLocaleDateString("vi-VN", { weekday: "short" });
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function TimeseriesChart({ data, range }: { data: StatsTimeseriesPoint[]; range: Range }) {
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 16, bottom: 28, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const series: { key: keyof StatsTimeseriesPoint; label: string; color: string }[] = [
    { key: "products", label: "Sản phẩm", color: "#1B3A8C" },
    { key: "posts", label: "Bài viết", color: "#F5A623" },
    { key: "users", label: "Người dùng", color: "#4FB8E7" },
  ];

  const max = useMemo(() => {
    let m = 0;
    for (const p of data) {
      m = Math.max(m, p.products, p.posts, p.users);
    }
    return m === 0 ? 1 : m;
  }, [data]);

  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const path = (key: keyof StatsTimeseriesPoint) =>
    data
      .map((p, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + innerH - (Number(p[key]) / max) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-160" preserveAspectRatio="none">
        {tickValues.map((v, i) => {
          const y = padding.top + innerH - (v / max) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
                {v}
              </text>
            </g>
          );
        })}
        {data.map((p, i) => {
          if (range === 7 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) {
            const x = padding.left + i * stepX;
            return (
              <text
                key={p.date}
                x={x}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity={0.6}
              >
                {formatDay(p.date, range)}
              </text>
            );
          }
          return null;
        })}
        {series.map((s) => (
          <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" />
        ))}
        {series.map((s) =>
          data.map((p, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + innerH - (Number(p[s.key]) / max) * innerH;
            return <circle key={`${s.key}-${i}`} cx={x} cy={y} r={2.5} fill={s.color} />;
          }),
        )}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 px-2 text-xs">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && user && user.role !== "ADMIN" && user.role !== "STAFF") {
      router.replace("/");
    }
  }, [isHydrated, user, router]);

  const products = useAdminProducts({ pageSize: 1 });
  const posts = useAdminPosts({ pageSize: 1 });
  const users = useAdminUsers({ pageSize: 1 });
  const reviews = useAdminReviews({ pageSize: 5 });
  const categories = useCategories();

  const [range, setRange] = useState<Range>(7);
  const ts = useStatsTimeseries(range);

  const stats = [
    { label: "Sản phẩm", value: products.data?.totalItems, icon: Package, color: "from-blue-500 to-cyan-500" },
    { label: "Bài viết", value: posts.data?.totalItems, icon: FileText, color: "from-amber-500 to-orange-500" },
    { label: "Danh mục", value: categories.data?.length, icon: FolderTree, color: "from-emerald-500 to-teal-500" },
    { label: "Người dùng", value: users.data?.totalItems, icon: Users, color: "from-violet-500 to-purple-500" },
  ];

  return (
    <div className="space-y-8">
      <motion.div suppressHydrationWarning initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Tổng quan hoạt động hệ thống VHD Corp</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              suppressHydrationWarning
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="mt-2 text-3xl font-bold">
                        {s.value ?? <Skeleton className="h-8 w-16" />}
                      </p>
                    </div>
                    <div className={`grid h-12 w-12 place-items-center rounded-xl bg-linear-to-br ${s.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
              <h2 className="text-lg font-bold">Tăng trưởng theo ngày</h2>
            </div>
            <div className="inline-flex rounded-md border p-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRange(d)}
                  className={
                    "px-3 py-1 text-xs rounded transition " +
                    (range === d
                      ? "bg-brand-primary text-white"
                      : "text-muted-foreground hover:bg-accent/40")
                  }
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>
          {ts.isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : (ts.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <TimeseriesChart data={ts.data ?? []} range={range} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold">Đánh giá gần đây</h2>
          </div>
          {reviews.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (reviews.data?.records ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
          ) : (
            <ul className="divide-y">
              {(reviews.data?.records ?? []).map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.user?.name ?? "Khách"} <span className="font-normal text-muted-foreground">đánh giá</span> {r.product?.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{r.content}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    <TrendingUp className="h-3 w-3" /> {r.rating}/5
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
