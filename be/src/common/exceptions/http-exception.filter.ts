import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { format } from 'date-fns';

/** Dịch các message mặc định tiếng Anh của NestJS sang tiếng Việt */
const VI_DEFAULTS: Record<string, string> = {
  Unauthorized: 'Chưa đăng nhập hoặc phiên đã hết hạn',
  Forbidden: 'Bạn không có quyền thực hiện thao tác này',
  'Forbidden resource': 'Bạn không có quyền thực hiện thao tác này',
  'Bad Request': 'Yêu cầu không hợp lệ',
  'Not Found': 'Không tìm thấy tài nguyên',
  Conflict: 'Dữ liệu bị trùng lặp',
  'Unprocessable Entity': 'Dữ liệu không hợp lệ',
  'Payload Too Large': 'Dữ liệu gửi lên quá lớn',
  'Too Many Requests': 'Bạn thao tác quá nhanh — vui lòng thử lại sau ít phút',
  'ThrottlerException: Too Many Requests':
    'Bạn thao tác quá nhanh — vui lòng thử lại sau ít phút',
  'Internal server error': 'Có lỗi hệ thống, vui lòng thử lại sau',
  'Internal Server Error': 'Có lỗi hệ thống, vui lòng thử lại sau',
  'Bad Gateway': 'Dịch vụ phía sau không phản hồi — vui lòng thử lại sau',
  'Service Unavailable': 'Dịch vụ tạm thời gián đoạn — vui lòng thử lại sau',
};

const toVi = (m: string): string => {
  if (VI_DEFAULTS[m]) return VI_DEFAULTS[m];
  // 404 route động của Nest: "Cannot GET /api/xyz"
  const notFound = m.match(/^Cannot [A-Z]+ (.+)$/);
  if (notFound) return `Không tồn tại đường dẫn ${notFound[1]}`;
  return m;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Lấy message rồi dịch các default tiếng Anh sang tiếng Việt
    const exceptionResponse = exception.getResponse();
    const raw =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as any).message ?? 'Internal server error');
    const message = Array.isArray(raw)
      ? raw.map((m: string) => toVi(m))
      : toVi(String(raw));

    response.status(status).json({
      statusCode: status,
      timestamp: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
      path: request.url,
      message: message,
    });
  }
}
