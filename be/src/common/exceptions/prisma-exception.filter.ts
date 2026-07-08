import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@vhd/prisma-client';
import { Request, Response } from 'express';
import { format } from 'date-fns';

/**
 * Map Prisma known errors → proper HTTP status để không leak 500.
 * - P2025 (record not found) → 404
 * - P2002 (unique violation) → 409
 * - P2003 (foreign key violation) → 400
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi cơ sở dữ liệu';

    switch (exception.code) {
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Không tìm thấy bản ghi';
        break;
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        message = target
          ? `Giá trị đã tồn tại: ${target}`
          : 'Giá trị đã tồn tại';
        break;
      }
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Tham chiếu khoá ngoại không hợp lệ';
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Lỗi cơ sở dữ liệu';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
      path: request.url,
      message,
      code: exception.code,
    });
  }
}
