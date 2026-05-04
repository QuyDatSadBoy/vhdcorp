import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import * as sanitizeHtml from "sanitize-html";


@Injectable()
export class SanitizeHtmlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (request?.body) request.body = sanitizeObject(request.body);
    if (request?.params) request.params = sanitizeObject(request.params);
    if (request?.query) request.query = sanitizeObject(request.query);

    return next.handle().pipe(
      map(data => sanitizeObject(data))
    );
  }
}


function sanitizeObject(obj: any, seen = new WeakSet()): any {
  if (typeof obj === "string") {
    return sanitizeHtml(obj, {
      allowedTags: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "a"],
      allowedAttributes: {
        a: ["href", "title"]
      },
      allowedSchemes: ["http", "https"] // Allow only safe URL schemes
    });
  }

  if (typeof obj === "object" && obj !== null) {
    // Avoid infinite loops due to circular references
    if (seen.has(obj)) {
      return obj;
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObject(item, seen)); // Handle arrays
    }

    Object.keys(obj).forEach((key) => {
      obj[key] = sanitizeObject(obj[key], seen);
    });
  }

  return obj;
}