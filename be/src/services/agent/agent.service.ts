import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cầu nối BE → AI Agent (FastAPI :8001).
 * - notifyProductsChanged(): push resync catalog NGAY khi admin sửa sản phẩm/danh mục
 *   (fire-and-forget — agent còn vòng auto-sync 30s làm lưới an toàn).
 * - getKnowledge()/saveKnowledge(): proxy đọc/ghi knowledge.md cho trang admin
 *   (secret của agent chỉ nằm ở BE, không lộ ra FE).
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('AGENT_URL') ?? 'http://localhost:8001';
  }

  /** Fire-and-forget — KHÔNG await ở call-site, lỗi mạng không được fail request admin. */
  notifyProductsChanged(): void {
    const secret = this.config.get<string>('AGENT_RESYNC_SECRET');
    if (!secret) return;
    fetch(`${this.baseUrl}/api/admin/resync-products`, {
      method: 'POST',
      headers: { 'X-Resync-Secret': secret },
    }).catch((err: Error) => {
      this.logger.warn(`Không báo được agent resync catalog: ${err.message}`);
    });
  }

  async getKnowledge(): Promise<{ content: string }> {
    const res = await fetch(`${this.baseUrl}/api/admin/knowledge`, {
      headers: { 'X-Admin-Secret': this.adminSecret },
    });
    if (!res.ok) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    return (await res.json()) as { content: string };
  }

  async saveKnowledge(
    content: string,
  ): Promise<{ ok: boolean; chars: number }> {
    const res = await fetch(`${this.baseUrl}/api/admin/knowledge`, {
      method: 'PUT',
      headers: {
        'X-Admin-Secret': this.adminSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    return (await res.json()) as { ok: boolean; chars: number };
  }

  private get adminSecret(): string {
    return this.config.get<string>('AGENT_ADMIN_SECRET') ?? '';
  }

  /** Chống spam chat: đọc cấu hình giới hạn (bảo vệ chi phí API AI). */
  async getChatLimits(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/admin/chat-limits`, {
      headers: { 'X-Admin-Secret': this.adminSecret },
    });
    if (!res.ok) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }

  /** Thống kê sử dụng AI + ước tính chi phí. */
  async getUsage(days = 30): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/admin/usage?days=${days}`, {
      headers: { 'X-Admin-Secret': this.adminSecret },
    });
    if (!res.ok) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }

  /** Chống spam chat: lưu cấu hình giới hạn (hiệu lực ngay). */
  async saveChatLimits(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/admin/chat-limits`, {
      method: 'PUT',
      headers: {
        'X-Admin-Secret': this.adminSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }

  /** AI viết mô tả sản phẩm từ ảnh + prompt (proxy sang agent, secret ẩn ở BE). */
  async aiProductDescription(body: {
    images?: string[];
    prompt?: string;
    name?: string;
  }): Promise<Record<string, unknown>> {
    return this.postAi('/api/admin/ai/product-description', body);
  }

  /** AI soạn dàn ý/bài viết từ ý tưởng + ảnh. */
  async aiPostDraft(body: {
    idea?: string;
    images?: string[];
  }): Promise<Record<string, unknown>> {
    return this.postAi('/api/admin/ai/post-draft', body);
  }

  /** Trợ lý tổng quát admin: chat → soạn nháp sản phẩm/bài viết (admin duyệt sau). */
  async aiAssistant(body: {
    messages?: { role: string; content: string }[];
    categories?: string[];
  }): Promise<Record<string, unknown>> {
    return this.postAi('/api/admin/ai/assistant', body);
  }

  private async postAi(
    path: string,
    body: unknown,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-Admin-Secret': this.adminSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);
    if (!res || !res.ok) {
      throw new BadGatewayException(
        'AI không phản hồi — thử lại sau giây lát.',
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }
}
