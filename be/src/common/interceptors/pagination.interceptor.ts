import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";


export class PaginationInterceptor implements NestInterceptor{
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(map((data) => {
      if (!Array.isArray(data)) return data;
      const request = context.switchToHttp().getRequest();
      const page = Number(request.query.pageNumber) > 0 ? Number(request.query.pageNumber) : 1;
      const limit = Number(request.query?.pageSize) && Number(request.query.pageSize) > 0 ? Number(request.query.pageSize) : 16;
      const takenData = data.slice((page - 1) * limit, limit);
      const totalPages = Math.ceil(data.length / limit);
      return {
        records: takenData,
        currentPage: page,
        totalPages,
        totalItems: data.length,
        pageSize: limit,
      };
    }));
  }
}