import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
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
}
