import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { Role } from '@vhd/prisma-client';
import { AgentService } from './agent.service';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';

/** Proxy admin ↔ AI Agent: sửa knowledge.md từ giao diện admin (JWT, không lộ secret). */
@Controller('agent')
@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('knowledge')
  getKnowledge() {
    return this.agent.getKnowledge();
  }

  /** Thống kê sử dụng AI + ước tính chi phí. */
  @Get('usage')
  getUsage(@Query('days') days?: string) {
    return this.agent.getUsage(days ? Number(days) : 30);
  }

  /** Top IP hoạt động 24h — phát hiện IP nghi vấn để chặn. */
  @Get('top-ips')
  getTopIps(@Query('limit') limit?: string) {
    return this.agent.getTopIps(limit ? Number(limit) : 15);
  }

  /** Chống spam chat AI — xem cấu hình giới hạn (bảo vệ chi phí API). */
  @Get('chat-limits')
  getChatLimits() {
    return this.agent.getChatLimits();
  }

  /** Chống spam chat AI — lưu cấu hình giới hạn (hiệu lực ngay). */
  @Put('chat-limits')
  saveChatLimits(
    @Body()
    body: {
      enabled?: boolean;
      per_ip_per_min?: number;
      per_ip_per_hour?: number;
      per_ip_per_day?: number;
      global_per_day?: number;
      blocked_ips?: string[];
      usd_to_vnd?: number;
      model_prices?: Record<string, { in: number; out: number }>;
      daily_budget_usd?: number;
      monthly_budget_usd?: number;
      currency?: string;
    },
  ) {
    return this.agent.saveChatLimits(body);
  }

  @Put('knowledge')
  saveKnowledge(@Body() dto: UpdateKnowledgeDto) {
    return this.agent.saveKnowledge(dto.markdown);
  }

  /** AI viết mô tả sản phẩm từ ảnh + prompt (admin tải ảnh lên → AI đọc ảnh + web search). */
  @Post('ai/product-description')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  aiProductDescription(
    @Body() body: { images?: string[]; prompt?: string; name?: string },
  ) {
    return this.agent.aiProductDescription(body);
  }

  /** AI soạn dàn ý/bài viết từ ý tưởng hoặc ảnh. */
  @Post('ai/post-draft')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  aiPostDraft(@Body() body: { idea?: string; images?: string[] }) {
    return this.agent.aiPostDraft(body);
  }

  /** Trợ lý tổng quát admin: chat → soạn nháp sản phẩm/bài viết. */
  @Post('ai/assistant')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  aiAssistant(
    @Body()
    body: {
      messages?: { role: string; content: string }[];
      categories?: string[];
    },
  ) {
    return this.agent.aiAssistant(body);
  }
}
