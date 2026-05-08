import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import * as sanitizeHtml from "sanitize-html";

// Chỉ sanitize những field thật sự chứa HTML người dùng nhập (rich-text).
// Các field text thuần (name, slug, email, title…) KHÔNG được encode để tránh
// hiển thị "Nhựa &amp; Cao su" thay vì "Nhựa & Cao su".
const HTML_FIELDS = new Set<string>([
  "content",
  "description",
  "body",
  "excerpt",
  "summary",
  "html",
  "richText",
  "customCss",
]);

@Injectable()
export class SanitizeHtmlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (request?.body) request.body = sanitizeObject(request.body);
    // Note: req.query / req.params là getter-only trong Express 5 — sanitize phía service nếu cần.
    // KHÔNG sanitize response để tránh double-encode dữ liệu đọc từ DB.
    return next.handle();
  }
}


function sanitizeObject(obj: any, key?: string, seen = new WeakSet()): any {
  if (typeof obj === "string") {
    if (!key || !HTML_FIELDS.has(key)) return obj;
    return sanitizeHtml(obj, {
      allowedTags: [
        "p", "br", "hr",
        "b", "strong", "i", "em", "u", "s", "del",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li",
        "blockquote",
        "code", "pre",
        "a", "img",
        "span", "div",
        "table", "thead", "tbody", "tr", "th", "td",
        "figure", "figcaption"
      ],
      allowedAttributes: {
        a: ["href", "title", "target", "rel"],
        img: ["src", "alt", "title", "width", "height"],
        span: ["class"],
        div: ["class"],
        code: ["class"],
        pre: ["class"],
        th: ["colspan", "rowspan"],
        td: ["colspan", "rowspan"]
      },
      allowedSchemes: ["http", "https", "data", "mailto", "tel"]
    });
  }

  if (typeof obj === "object" && obj !== null) {
    // Avoid infinite loops due to circular references
    if (seen.has(obj)) {
      return obj;
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObject(item, key, seen));
    }

    Object.keys(obj).forEach((k) => {
      obj[k] = sanitizeObject(obj[k], k, seen);
    });
  }

  return obj;
}