import { Logger } from '@nestjs/common';

const logger = new Logger('Revalidate');

/**
 * Gọi FE Next.js /api/revalidate để XOÁ cache theo tag khi dữ liệu đổi.
 * Fire-and-forget: không chặn/không làm hỏng request nếu FE lỗi.
 * Nhờ đó FE cache được (siêu nhanh) mà admin sửa vẫn "thấy ngay".
 */
export function revalidateFe(...tags: string[]): void {
  const feUrl = process.env.FE_INTERNAL_URL || 'http://localhost:3001';
  const secret = process.env.REVALIDATE_SECRET || 'vhdcorp-revalidate';
  for (const tag of tags) {
    void fetch(`${feUrl}/api/revalidate?tag=${encodeURIComponent(tag)}`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': secret },
      signal: AbortSignal.timeout(5000),
    }).catch((e: unknown) =>
      logger.warn(
        `revalidate tag=${tag} lỗi: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}
