import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  data: T;
  message?: string;
}

/**
 * TransformInterceptor — chuẩn hóa mọi response thành ApiEnvelope.
 * Nếu service trả string → đặt vào field `message`.
 * KHÔNG xóa field `id` (mọi entity đều cần id cho FE).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode: number }>();
    return next.handle().pipe(
      map((data) => {
        if (typeof data === 'string') {
          return {
            statusCode: response.statusCode,
            success: response.statusCode < 400,
            message: data,
            data: undefined as unknown as T,
          };
        }
        return {
          statusCode: response.statusCode,
          success: response.statusCode < 400,
          data: data as T,
        };
      }),
    );
  }
}
