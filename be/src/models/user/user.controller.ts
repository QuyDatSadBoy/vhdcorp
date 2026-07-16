import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationInterceptor } from '@interceptor/pagination.interceptor';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { CurrentUser, JwtPayload } from '@decorator/current-user.decorator';
import { Role } from '@vhd/prisma-client';
import { ChangePasswordDto, UpdateMeDto } from './dto/update-me.dto';
import { AdminResetPasswordDto, CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SendMailDto } from './dto/send-mail.dto';

@Controller('users')
@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(PaginationInterceptor)
  async getAll(
    @Query('pageNumber') _pageNumber?: string,
    @Query('pageSize') _pageSize?: string,
    @Query('email') email?: string,
    @Query('orderBy') orderBy?: string,
    @Query('deletedOnly') deletedOnly?: string,
    @Query('role') role?: string,
  ) {
    const roleFilter = ['ADMIN', 'STAFF', 'CUSTOMER'].includes(role ?? '')
      ? (role as Role)
      : undefined;
    return this.userService.list({
      where: {
        // deletedOnly=true → thùng rác (chỉ user đã xóa, để khôi phục)
        deletedAt: deletedOnly === 'true' ? { not: null } : null,
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(email && email.trim() !== ''
          ? { email: { contains: email, mode: 'insensitive' } }
          : {}),
      },
      orderBy:
        orderBy === 'name' || orderBy === 'id'
          ? { [orderBy]: 'asc' }
          : { createdAt: 'desc' },
    });
  }

  /** Admin tạo tài khoản mới (nhân viên/khách) */
  @Post()
  @Roles(Role.ADMIN)
  async adminCreate(@Body() dto: CreateUserDto) {
    return this.userService.adminCreate(dto);
  }

  // ── Self-service endpoints — mọi user đã đăng nhập đều dùng được ───
  @Put('me')
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.userService.updateMe(user.sub, dto);
  }

  /** Đổi email chính chủ — yêu cầu xác nhận mật khẩu hiện tại */
  @Put('me/email')
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  async changeEmail(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { newEmail: string; password: string },
  ) {
    return this.userService.changeEmail(user.sub, dto.newEmail, dto.password);
  }

  @Put('me/password')
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ── Admin endpoints — chỉ ADMIN mới được đổi role / xóa user ───
  @Patch(':id/role')
  @Roles(Role.ADMIN)
  async updateRole(
    @CurrentUser() current: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: Role },
  ) {
    return this.userService.updateRole(current.sub, id, body.role);
  }

  /** Admin gửi email tới 1/nhiều/tất cả user — hỗ trợ biến {{name}}, {{email}} */
  @Post('send-mail')
  @Roles(Role.ADMIN)
  async sendMail(@Body() dto: SendMailDto) {
    return this.userService.sendBulkEmail(dto);
  }

  /** Admin sửa thông tin user (tên hiển thị) */
  @Patch(':id')
  @Roles(Role.ADMIN)
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.adminUpdate(id, { name: dto.name });
  }

  /** Admin đặt lại mật khẩu cho user (không cần mật khẩu cũ) */
  @Patch(':id/password')
  @Roles(Role.ADMIN)
  async adminResetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.userService.adminResetPassword(id, dto.newPassword);
  }

  /** Khôi phục user đã xóa */
  @Post(':id/restore')
  @Roles(Role.ADMIN)
  async restore(@Param('id', ParseIntPipe) id: number) {
    return this.userService.restore(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async softDelete(
    @CurrentUser() current: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (current.sub === id) {
      throw new BadRequestException('Không thể tự xóa chính mình');
    }
    return this.userService.softDelete(id);
  }
}
