import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AppMetricsService } from './app-metrics.service';

/** Bỏ qua các request "nội bộ" (polling trang Server, health) để RPM phản ánh traffic THẬT */
const SKIP = ['/server/', '/health'];

/**
 * Đếm mọi request HTTP (thời gian + status) → AppMetricsService.
 * Toàn cục qua APP_INTERCEPTOR; siêu nhẹ (chỉ tăng biến đếm in-memory).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: AppMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<{ url?: string }>();
    const url = req?.url ?? '';
    if (SKIP.some((s) => url.includes(s))) return next.handle();

    const start = Date.now();
    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    return next.handle().pipe(
      tap(() =>
        this.metrics.record(res?.statusCode ?? 200, Date.now() - start),
      ),
      catchError((err: { status?: number; statusCode?: number }) => {
        this.metrics.record(
          err?.status ?? err?.statusCode ?? 500,
          Date.now() - start,
        );
        return throwError(() => err);
      }),
    );
  }
}
