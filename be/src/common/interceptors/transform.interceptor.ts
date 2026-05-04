import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;
    return next.handle().pipe(map((data) => {
      if (typeof data === "string") { // Data in string
        data = {
          message: data
        };
      }
      if(typeof data === "object") {
        delete data?.id;
      }
      return { statusCode: statusCode, data: data };
    }));
  }

}