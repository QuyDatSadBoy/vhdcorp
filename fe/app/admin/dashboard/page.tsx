"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  FileText,
  Users,
  Star,
  TrendingUp,
  FolderTree,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthStore } from "@/store/auth.store";
import { useAdminProducts } from "@/services/product.service";
import { useAdminPosts } from "@/services/post.service";
import { useAdminUsers } from "@/services/user.service";
import { useAdminReviews } from "@/services/review.service";
import { useCategories } from "@/services/category.service";
import {
  useStatsTimeseries,
  useStatsCategoriesBreakdown,
  useStatsTopProducts,
  type StatsTimeseriesPoint,
} from "@/services/statistics.service";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Range = 7 | 30;

/** Bảng màu chính cho biểu đồ — đồng bộ với brand */
const SERIES_COLORS = {
  products: "#1B3A8C",
  posts: "#F5A623",
  users: "#4FB8E7",
};

const PIE_PALETTE = ["#1B3A8C", "#4FB8E7", "#F5A623", "#10B981", "#8B5CF6", "#EC4899", "#F43F5E", "#14B8A6"];

function formatDay(iso: string, range: Range) {
  const d = new Date(iso);
  if (range === 7) {
    const wk = d.toLocaleDateString("vi-VN", { weekday: "short" });
    return wk.charAt(0).toUpperCase() + wk.slice(1);
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Tooltip tuỳ biến — gradient nhẹ, viền tinh tế */
interface TooltipPayloadItem {
  color?: string;
  name?: string;
  value?: number | string;
  dataKey?: string;
}
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {label != null && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-semibold text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mini sparkline cho stat card */
function MiniSpark({
  data,
  color,
  dataKey,
}: {
  data: StatsTimeseriesPoint[];
  color: string;
  dataKey: keyof StatsTimeseriesPoint;
}) {
  const cleaned = data.map((d) => ({ ...d, [dataKey]: Number(d[dataKey] ?? 0) }));
  return (
    <ResponsiveContainer width="100%" height={36} minWidth={1} minHeight={1}>
      <AreaChart data={cleaned} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey as string}
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#spark-${String(dataKey)})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Mini bar sparkline cho stat card không có timeseries (vd: Danh mục) */
function MiniBars({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36} minWidth={1} minHeight={1}>
      <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="spark-cat-bars" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <Bar dataKey="v" fill="url(#spark-cat-bars)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: number;
  spark?: React.ReactNode;
  index: number;
}
function StatCard({ label, value, icon: Icon, gradient, trend, spark, index }: StatCardProps) {
  const trendValue = typeof trend === "number" ? trend : undefined;
  const trendUp = (trendValue ?? 0) >= 0;
  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group relative overflow-hidden border-foreground/8 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                {value == null ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <span className="text-3xl font-bold tabular-nums">{value.toLocaleString("vi-VN")}</span>
                )}
                {trendValue != null && (
                  <span
                    className={
                      "inline-flex items-center gap-0.5 text-xs font-semibold " +
                      (trendUp ? "text-emerald-600" : "text-rose-600")
                    }
                  >
                    {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {trendUp ? "+" : ""}
                    {trendValue}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-linear-to-br ${gradient} text-white shadow-sm`}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
          {spark && <div className="-mx-1 mt-3 h-9">{spark}</div>}
        </CardContent>
      </Card>
    </motion.div>
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
  const usersQ = useAdminUsers({ pageSize: 1 });
  const reviews = useAdminReviews({ pageSize: 5 });
  const categories = useCategories();

  const [range, setRange] = useState<Range>(7);
  const ts = useStatsTimeseries(range);
  const breakdown = useStatsCategoriesBreakdown();
  const top = useStatsTopProducts(6);

  const tsData = useMemo(() => {
    return (ts.data ?? []).map((p) => ({
      ...p,
      label: formatDay(p.date, range),
    }));
  }, [ts.data, range]);

  // Trend nửa kỳ — so sánh tổng nửa sau với nửa đầu
  const trends = useMemo(() => {
    const data = ts.data ?? [];
    if (data.length < 2) return { products: 0, posts: 0, users: 0 };
    const mid = Math.floor(data.length / 2);
    const sum = (arr: typeof data, key: "products" | "posts" | "users") =>
      arr.reduce((s, p) => s + Number(p[key] ?? 0), 0);
    const calc = (key: "products" | "posts" | "users") => {
      const a = sum(data.slice(0, mid), key);
      const b = sum(data.slice(mid), key);
      return b - a;
    };
    return {
      products: calc("products"),
      posts: calc("posts"),
      users: calc("users"),
    };
  }, [ts.data]);

  const pieData = useMemo(
    () =>
      (breakdown.data ?? [])
        .filter((c) => c.count > 0)
        .slice(0, 8)
        .map((c) => ({ name: c.name, value: c.count })),
    [breakdown.data]
  );

  const totalCategorized = pieData.reduce((s, p) => s + p.value, 0);

  const topData = useMemo(
    () =>
      (top.data ?? []).map((p) => ({
        name: p.name.length > 28 ? p.name.slice(0, 27) + "…" : p.name,
        fullName: p.name,
        slug: p.slug,
        reviews: p.reviews,
        stock: p.stock,
      })),
    [top.data]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Tổng quan
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi hoạt động hệ thống VHD Corp theo thời gian thực.
          </p>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Sản phẩm"
          value={products.data?.totalItems}
          icon={Package}
          gradient="from-blue-500 to-cyan-500"
          trend={trends.products}
          spark={tsData.length ? <MiniSpark data={tsData} color={SERIES_COLORS.products} dataKey="products" /> : null}
        />
        <StatCard
          index={1}
          label="Bài viết"
          value={posts.data?.totalItems}
          icon={FileText}
          gradient="from-amber-500 to-orange-500"
          trend={trends.posts}
          spark={tsData.length ? <MiniSpark data={tsData} color={SERIES_COLORS.posts} dataKey="posts" /> : null}
        />
        <StatCard
          index={2}
          label="Danh mục"
          value={categories.data?.length}
          icon={FolderTree}
          gradient="from-emerald-500 to-teal-500"
          spark={pieData.length ? <MiniBars data={pieData.map((p) => p.value)} color="#10B981" /> : null}
        />
        <StatCard
          index={3}
          label="Người dùng"
          value={usersQ.data?.totalItems}
          icon={Users}
          gradient="from-violet-500 to-purple-500"
          trend={trends.users}
          spark={tsData.length ? <MiniSpark data={tsData} color={SERIES_COLORS.users} dataKey="users" /> : null}
        />
      </div>

      {/* Main growth chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-primary" />
                <h2 className="text-lg font-bold">Tăng trưởng theo ngày</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sản phẩm, bài viết và người dùng tạo mới trong{" "}
                <span className="font-semibold text-foreground">{range}</span> ngày qua.
              </p>
            </div>
            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRange(d)}
                  className={
                    "cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                    (range === d
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground")
                  }
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>

          {ts.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : tsData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Chưa có dữ liệu để hiển thị.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={tsData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="grad-products" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS.products} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={SERIES_COLORS.products} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-posts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS.posts} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={SERIES_COLORS.posts} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS.users} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={SERIES_COLORS.users} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="currentColor"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={range === 30 ? 16 : 4}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    stroke="currentColor"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                    className="text-muted-foreground"
                  />
                  <ReTooltip content={<ChartTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.15 }} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={(v) => <span className="text-foreground/80">{v}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="products"
                    name="Sản phẩm"
                    stroke={SERIES_COLORS.products}
                    fill="url(#grad-products)"
                    strokeWidth={2}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="posts"
                    name="Bài viết"
                    stroke={SERIES_COLORS.posts}
                    fill="url(#grad-posts)"
                    strokeWidth={2}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Người dùng"
                    stroke={SERIES_COLORS.users}
                    fill="url(#grad-users)"
                    strokeWidth={2}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-column: donut + horizontal bar */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Donut — phân bổ sản phẩm theo danh mục */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold">Phân bổ theo danh mục</h2>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Tỷ trọng sản phẩm trên các danh mục cấp 1.</p>
            {breakdown.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Chưa có dữ liệu danh mục.</p>
            ) : (
              <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="var(--background)"
                      strokeWidth={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <ReTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums">{totalCategorized}</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Sản phẩm</span>
                </div>
              </div>
            )}
            {pieData.length > 0 && (
              <ul className="mt-4 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                {pieData.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-2 truncate">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
                    />
                    <span className="truncate text-muted-foreground">{p.name}</span>
                    <span className="ml-auto font-semibold tabular-nums">{p.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Horizontal bar — Top products by reviews */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-brand-primary" />
              <h2 className="text-lg font-bold">Top sản phẩm theo đánh giá</h2>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">6 sản phẩm có lượt đánh giá cao nhất.</p>
            {top.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : topData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Chưa có sản phẩm nào.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={topData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="grad-bar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4FB8E7" />
                        <stop offset="100%" stopColor="#1B3A8C" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis
                      type="number"
                      stroke="currentColor"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="currentColor"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                      className="text-muted-foreground"
                    />
                    <ReTooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
                    <Bar dataKey="reviews" name="Đánh giá" fill="url(#grad-bar)" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent reviews */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold">Đánh giá gần đây</h2>
            </div>
            <Link
              href="/admin/reviews"
              className="text-xs font-semibold text-brand-primary underline-offset-4 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>
          {reviews.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (reviews.data?.records ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
          ) : (
            <ul className="divide-y">
              {(reviews.data?.records ?? []).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.user?.name ?? "Khách"} <span className="font-normal text-muted-foreground">đánh giá</span>{" "}
                      <Link
                        href={`/admin/products/${r.product?.id ?? ""}`}
                        className="text-brand-primary hover:underline"
                      >
                        {r.product?.name}
                      </Link>
                    </p>
                    {r.content && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.content}</p>}
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-500" />
                    {r.rating}/5
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
