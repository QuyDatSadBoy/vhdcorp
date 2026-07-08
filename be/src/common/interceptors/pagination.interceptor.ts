import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export class PaginationInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data) => {
        if (!Array.isArray(data)) return data;
        const request = context.switchToHttp().getRequest();
        // Chấp nhận cả `pageNumber/pageSize` (legacy) và `page/limit` (REST chuẩn).
        const rawPage =
          Number(request.query.pageNumber) > 0
            ? Number(request.query.pageNumber)
            : Number(request.query.page) > 0
              ? Number(request.query.page)
              : 1;
        const rawSize =
          Number(request.query.pageSize) > 0
            ? Number(request.query.pageSize)
            : Number(request.query.limit) > 0
              ? Number(request.query.limit)
              : 16;
        const limit = Math.min(rawSize, 100);
        const skip = (rawPage - 1) * limit;
        // Fix: slice(start, end) — end là vị trí, không phải offset
        const takenData = data.slice(skip, skip + limit);
        const totalPages = Math.max(1, Math.ceil(data.length / limit));
        return {
          records: takenData,
          currentPage: rawPage,
          totalPages,
          totalItems: data.length,
          pageSize: limit,
        };
      }),
    );
  }
}
