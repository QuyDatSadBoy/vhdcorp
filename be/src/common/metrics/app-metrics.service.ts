import { Injectable } from '@nestjs/common';

interface MinuteBucket {
  minute: number; // epoch phút
  count: number;
  errors: number; // 5xx
  clientErr: number; // 4xx
  sumMs: number;
}

/**
 * Đo lưu lượng ứng dụng (APM nhẹ, in-memory): tổng request, pass/4xx/5xx, độ trễ,
 * RPM và chuỗi theo phút 2 giờ gần nhất — cho biểu đồ traffic trên trang Server.
 * Không dùng DB/daemon ngoài; reset khi restart (chấp nhận được cho chỉ số live).
 */
@Injectable()
export class AppMetricsService {
  private total = 0;
  private ok = 0; // 2xx/3xx
  private clientErr = 0; // 4xx
  private serverErr = 0; // 5xx
  private sumLatencyMs = 0;
  private readonly startedAt = Date.now();
  /** Ring 120 phút — key theo epoch phút */
  private readonly buckets = new Map<number, MinuteBucket>();

  record(status: number, ms: number) {
    this.total++;
    this.sumLatencyMs += ms;
    if (status >= 500) this.serverErr++;
    else if (status >= 400) this.clientErr++;
    else this.ok++;

    const minute = Math.floor(Date.now() / 60_000);
    let b = this.buckets.get(minute);
    if (!b) {
      b = { minute, count: 0, errors: 0, clientErr: 0, sumMs: 0 };
      this.buckets.set(minute, b);
      // Dọn bucket cũ hơn 120 phút
      const cutoff = minute - 120;
      for (const k of this.buckets.keys())
        if (k < cutoff) this.buckets.delete(k);
    }
    b.count++;
    b.sumMs += ms;
    if (status >= 500) b.errors++;
    else if (status >= 400) b.clientErr++;
  }

  snapshot(windowMin = 60) {
    const nowMin = Math.floor(Date.now() / 60_000);
    const series: {
      t: number;
      count: number;
      errors: number;
      clientErr: number;
      avgMs: number;
    }[] = [];
    for (let i = windowMin - 1; i >= 0; i--) {
      const min = nowMin - i;
      const b = this.buckets.get(min);
      series.push({
        t: min * 60_000,
        count: b?.count ?? 0,
        errors: b?.errors ?? 0,
        clientErr: b?.clientErr ?? 0,
        avgMs: b && b.count ? Math.round(b.sumMs / b.count) : 0,
      });
    }
    // RPM = số request phút vừa rồi (đã đủ 60s), fallback phút hiện tại
    const rpm =
      this.buckets.get(nowMin - 1)?.count ??
      this.buckets.get(nowMin)?.count ??
      0;
    return {
      total: this.total,
      ok: this.ok,
      clientErr: this.clientErr,
      serverErr: this.serverErr,
      errorRate: this.total
        ? Math.round((this.serverErr / this.total) * 1000) / 10
        : 0,
      avgLatencyMs: this.total ? Math.round(this.sumLatencyMs / this.total) : 0,
      rpm,
      sinceHours:
        Math.round(((Date.now() - this.startedAt) / 3600_000) * 10) / 10,
      series,
    };
  }
}
