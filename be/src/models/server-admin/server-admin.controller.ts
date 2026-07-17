import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ServerAdminService } from './server-admin.service';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { CurrentUser, JwtPayload } from '@decorator/current-user.decorator';
import { Role } from '@vhd/prisma-client';

/**
 * Quản trị VPS từ trang admin — CHỈ role ADMIN (không STAFF).
 * Mọi hành động là whitelist cố định; audit log ghi ai bấm gì khi nào.
 */
@Controller('server')
@ApiTags('Server Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ServerAdminController {
  constructor(private readonly service: ServerAdminService) {}

  @Get('metrics')
  metrics() {
    return this.service.getMetrics();
  }

  @Get('history')
  history() {
    return this.service.getHistory();
  }

  @Get('deploy')
  deployInfo() {
    return this.service.getDeployInfo();
  }

  @Post('deploy')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  startDeploy(@CurrentUser() user: JwtPayload) {
    return this.service.startDeploy(user.email);
  }

  @Get('deploy/log')
  deployLog() {
    return this.service.getDeployLog();
  }

  @Post('services/:name/restart')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  restart(@Param('name') name: string, @CurrentUser() user: JwtPayload) {
    return this.service.restartService(name, user.email);
  }

  @Get('services/:name/logs')
  serviceLogs(@Param('name') name: string, @Query('lines') lines?: string) {
    return this.service.getServiceLogs(
      name,
      Math.min(Number(lines) || 100, 500),
    );
  }

  @Post('cleanup/:task')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  cleanup(@Param('task') task: string, @CurrentUser() user: JwtPayload) {
    return this.service.cleanup(task, user.email);
  }

  @Get('backups')
  backups() {
    return this.service.listBackups();
  }

  @Post('backups')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  createBackup(@CurrentUser() user: JwtPayload) {
    return this.service.createBackup(user.email);
  }

  @Get('backups/:file')
  downloadBackup(@Param('file') file: string, @Res() res: Response) {
    const p = this.service.backupPath(file);
    res.download(p, file);
  }

  @Delete('backups/:file')
  deleteBackup(@Param('file') file: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteBackup(file, user.email);
  }

  @Get('audit')
  audit() {
    return this.service.getAudit();
  }
}
