import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
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
}
