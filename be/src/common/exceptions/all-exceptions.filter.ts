import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { format } from 'date-fns';

/**
 * Catch-all cuối cùng cho MỌI exception không phải HttpException/Prisma known error
 * (VD: database sập, lỗi lập trình bất ngờ) — trả thông báo tiếng Việt thân thiện
 * thay vì "Internal server error", và log đầy đủ để debug.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HttpException đã có filter riêng — nhưng phòng khi rơi vào đây vẫn xử lý đúng
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        timestamp: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
        path: request.url,
        message: exception.message,
      });
      return;
    }

    const err = exception as Error & { code?: string; errorCode?: string };
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Có lỗi hệ thống, vui lòng thử lại sau ít phút';

    // Prisma không kết nối được DB (P1001/P1002/P1017 hoặc InitializationError)
    const text = `${err?.name ?? ''} ${err?.message ?? ''}`;
    if (
      /Can't reach database server|PrismaClientInitializationError|ECONNREFUSED.*5432/i.test(
        text,
      ) ||
      ['P1001', 'P1002', 'P1017'].includes(err?.errorCode ?? err?.code ?? '')
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message =
        'Không kết nối được cơ sở dữ liệu — vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên';
    }

    this.logger.error(
      `Lỗi chưa xử lý tại ${request.method} ${request.url}: ${err?.message}`,
      err?.stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
      path: request.url,
      message,
    });
  }
}
