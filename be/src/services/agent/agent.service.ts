import { Readable } from 'stream';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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

  /**
   * Gọi endpoint admin của agent (cấu hình SKILL / MCP cho lõi DeepAgents).
   * Lỗi 4xx của agent (vd URL MCP không hợp lệ) được chuyển nguyên văn cho admin
   * thấy lý do, thay vì gộp hết thành "agent không phản hồi".
   */
  private async callDeep(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/admin/deep/${path}`, {
      method,
      headers: {
        'X-Admin-Secret': this.adminSecret,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }).catch(() => null);

    if (!res) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      const detail =
        typeof data.detail === 'string'
          ? data.detail
          : 'Agent AI từ chối yêu cầu.';
      throw new BadRequestException(detail);
    }
    return data;
  }

  getSkills() {
    return this.callDeep('skills');
  }

  saveSkill(body: {
    name: string;
    description?: string;
    content?: string;
    enabled?: boolean;
  }) {
    return this.callDeep('skills', 'POST', body);
  }

  deleteSkill(slug: string) {
    return this.callDeep(`skills/${encodeURIComponent(slug)}`, 'DELETE');
  }

  getMcpServers() {
    return this.callDeep('mcp');
  }

  saveMcpServer(body: {
    name: string;
    url: string;
    transport?: string;
    enabled?: boolean;
  }) {
    return this.callDeep('mcp', 'POST', body);
  }

  deleteMcpServer(name: string) {
    return this.callDeep(`mcp/${encodeURIComponent(name)}`, 'DELETE');
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

  /** Xoá sạch cache câu hỏi lặp (ép AI trả lời mới hoàn toàn). */
  async clearCache(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/api/admin/cache/clear`, {
      method: 'POST',
      headers: { 'X-Admin-Secret': this.adminSecret },
    });
    if (!res.ok) {
      throw new BadGatewayException(
        'Agent AI không phản hồi — kiểm tra service cổng 8001 đang chạy.',
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }

  /** Top IP hoạt động 24h — phát hiện IP nghi vấn để chặn 1 chạm. */
  async getTopIps(limit = 15): Promise<Record<string, unknown>> {
    const res = await fetch(
      `${this.baseUrl}/api/admin/top-ips?limit=${limit}`,
      {
        headers: { 'X-Admin-Secret': this.adminSecret },
      },
    );
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

  /**
   * Chuyển tiếp NGUYÊN LUỒNG SSE của trợ lý admin (message.delta / tool.start /
   * tool.end / todo / done) về cho trình duyệt.
   *
   * Phải đi qua đây chứ không gọi agent trực tiếp từ trang quản trị: khoá admin nằm
   * ở backend, đưa xuống client là lộ. Trả về ReadableStream để controller stream lại
   * mà không gom hết vào bộ nhớ — câu trả lời dài vẫn hiện dần.
   */
  async aiAssistantStream(body: {
    messages?: { role: string; content: string }[];
    categories?: string[];
  }): Promise<NodeJS.ReadableStream> {
    const res = await fetch(`${this.baseUrl}/api/admin/ai/assistant/stream`, {
      method: 'POST',
      headers: {
        'X-Admin-Secret': this.adminSecret,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok || !res.body) {
      throw new ServiceUnavailableException(
        `Trợ lý AI không phản hồi (HTTP ${res.status}).`,
      );
    }
    return Readable.fromWeb(res.body as never);
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
