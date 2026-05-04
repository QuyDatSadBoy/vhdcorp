import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { format } from 'date-fns';


@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Extract the error message
    const exceptionResponse = exception.getResponse();
    const message = typeof exceptionResponse === "string"
      ? exceptionResponse
      : (exceptionResponse as any).message || "Internal server error";

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
        path: request.url,
        message: message
      });
  }

}