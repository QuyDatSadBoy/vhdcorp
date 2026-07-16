import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@prisma/prisma.service';
import { MailService } from '@service/mail/mail.service';
import type { Prisma, User } from '@vhd/prisma-client';
import { Role } from '@vhd/prisma-client';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  phone: true,
  address: true,
  googleId: true,
  isRoot: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

/** Thông báo chung khi cố thao tác lên tài khoản quản trị tối cao */
const ROOT_PROTECTED_MSG =
  'Đây là tài khoản quản trị tối cao — không ai được xóa/đổi vai trò/đặt lại mật khẩu tài khoản này';

/**
 * UserService — CRUD cơ bản. Phase 2 sẽ mở rộng (soft delete, admin filter, ...).
 */
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  findUnique(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    try {
      return this.prisma.user.findUnique({ where });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  list(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      // Tuyệt đối không trả password / refreshTokenHash ra ngoài API
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        googleId: true,
        isRoot: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    return this.prisma.user.update(params);
  }

  /** Soft delete — set deletedAt thay vì xóa thật. KHÔNG cho xóa tài khoản root. */
  async softDelete(id: number): Promise<User> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    if (target.isRoot) throw new ForbiddenException(ROOT_PROTECTED_MSG);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Admin đổi role — chặn admin tự hạ quyền chính mình để không khóa hệ thống */
  async updateRole(currentUserId: number, targetUserId: number, role: Role) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('Role không hợp lệ');
    }
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Không thể tự đổi role của chính mình');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target || target.deletedAt)
      throw new NotFoundException('Người dùng không tồn tại');
    if (target.isRoot) throw new ForbiddenException(ROOT_PROTECTED_MSG);
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: SAFE_USER_SELECT,
    });
  }

  /** Cập nhật hồ sơ chính chủ — name + avatar */
  async updateMe(
    userId: number,
    data: { name?: string; avatar?: string; phone?: string; address?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt)
      throw new NotFoundException('Người dùng không tồn tại');
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.address !== undefined
          ? { address: data.address || null }
          : {}),
      },
      select: SAFE_USER_SELECT,
    });
  }

  /** Admin tạo tài khoản mới (STAFF/ADMIN/CUSTOMER) — hash mật khẩu, chặn trùng email */
  async adminCreate(data: {
    email: string;
    password?: string;
    name?: string;
    role?: Role;
  }) {
    if (!data.password) {
      throw new BadRequestException('Cần đặt mật khẩu cho tài khoản mới');
    }
    const existed = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existed) throw new BadRequestException('Email đã được sử dụng');
    const hash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hash,
        name: data.name ?? data.email.split('@')[0],
        role: data.role ?? Role.CUSTOMER,
        emailVerifiedAt: new Date(), // admin tạo trực tiếp → coi như đã xác minh
      },
      select: SAFE_USER_SELECT,
    });
  }

  /** Admin sửa thông tin user khác (hiện tại: tên hiển thị) */
  async adminUpdate(targetUserId: number, data: { name?: string }) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target || target.deletedAt)
      throw new NotFoundException('Người dùng không tồn tại');
    if (target.isRoot) throw new ForbiddenException(ROOT_PROTECTED_MSG);
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { ...(data.name !== undefined ? { name: data.name } : {}) },
      select: SAFE_USER_SELECT,
    });
  }

  /** Admin đặt lại mật khẩu cho user (quên mật khẩu…) — thu hồi refresh token */
  async adminResetPassword(targetUserId: number, newPassword: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target || target.deletedAt)
      throw new NotFoundException('Người dùng không tồn tại');
    if (target.isRoot)
      throw new ForbiddenException(
        ROOT_PROTECTED_MSG +
          ' — tài khoản root tự đổi mật khẩu bằng mật khẩu cũ',
      );
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { password: hash, refreshTokenHash: null },
    });
    return { message: 'Đã đặt lại mật khẩu' };
  }

  /** Khôi phục user đã soft-delete */
  async restore(targetUserId: number) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { deletedAt: null },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Admin gửi email tùy chỉnh tới nhiều user (tối đa 200/lần).
   * Hỗ trợ biến {{name}}/{{email}} — thay riêng cho từng người nhận. Gửi tuần tự,
   * lỗi từng địa chỉ không chặn các địa chỉ còn lại; trả thống kê sent/failed.
   */
  async sendBulkEmail(params: {
    userIds?: number[];
    subject: string;
    html: string;
  }): Promise<{ sent: number; failed: number; total: number }> {
    const where =
      params.userIds && params.userIds.length > 0
        ? { id: { in: params.userIds }, deletedAt: null }
        : { deletedAt: null };
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true },
      take: 200,
    });
    if (users.length === 0)
      throw new BadRequestException('Không có người nhận hợp lệ');

    let sent = 0;
    let failed = 0;
    for (const u of users) {
      // Thay biến; sau đó strip mọi {{...}} còn sót (vd admin lỡ sửa chữ bên trong ngoặc)
      const stripLeftover = (t: string) =>
        t.replace(/\{\{\s*([^}]*?)\s*\}\}/g, '$1');
      const personalized = stripLeftover(
        params.html
          .replaceAll('{{name}}', u.name || u.email.split('@')[0])
          .replaceAll('{{email}}', u.email),
      );
      const subject = stripLeftover(
        params.subject
          .replaceAll('{{name}}', u.name || u.email.split('@')[0])
          .replaceAll('{{email}}', u.email),
      );
      try {
        await this.mail.sendCustomEmail(u.email, subject, personalized);
        sent++;
      } catch {
        failed++;
      }
    }
    return { sent, failed, total: users.length };
  }

  /** Đổi email chính chủ — xác nhận bằng mật khẩu hiện tại, chặn trùng email */
  async changeEmail(userId: number, newEmail: string, password: string) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(newEmail ?? ''))
      throw new BadRequestException('Email mới không hợp lệ');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt)
      throw new NotFoundException('Người dùng không tồn tại');
    if (!user.password)
      throw new BadRequestException('Tài khoản Google — không đổi email được');
    const ok = await bcrypt.compare(password ?? '', user.password);
    if (!ok) throw new UnauthorizedException('Mật khẩu xác nhận không đúng');
    const existed = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existed && existed.id !== userId)
      throw new BadRequestException('Email đã được sử dụng');
    return this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: SAFE_USER_SELECT,
    });
  }

  /** Đổi mật khẩu chính chủ — yêu cầu mật khẩu hiện tại */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới tối thiểu 6 ký tự');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt)
      throw new NotFoundException('Người dùng không tồn tại');
    if (!user.password) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google — không có mật khẩu để đổi',
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, refreshTokenHash: null },
    });
    return { message: 'Đổi mật khẩu thành công' };
  }
}
