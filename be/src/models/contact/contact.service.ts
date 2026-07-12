import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { ContactStatus, type Prisma } from '@vhd/prisma-client';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { buildPaginationParams, toPaginated } from '@util/pagination';
import { MailService } from '@service/mail/mail.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /** Khách gửi liên hệ — lưu DB, trả về id để tra cứu */
  async submit(
    dto: CreateContactDto,
  ): Promise<{ id: number; message: string }> {
    const contact = await this.prisma.contact.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
      },
    });
    this.logger.log(`Liên hệ mới #${contact.id} từ ${dto.name} <${dto.email}>`);
    // Fire-and-forget: email lỗi chỉ log (MailService tự catch), không chặn response
    void this.mail.sendContactNotification(contact);
    void this.mail.sendContactConfirmation(contact);
    return {
      id: contact.id,
      message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.',
    };
  }

  /** Danh sách liên hệ cho admin — phân trang + filter status, mới nhất trước */
  async adminList(params: {
    pageNumber?: string;
    pageSize?: string;
    page?: string;
    limit?: string;
    status?: ContactStatus;
  }) {
    const { page, limit, skip, take } = buildPaginationParams(
      params.pageNumber,
      params.pageSize,
      params.page,
      params.limit,
    );
    const where: Prisma.ContactWhereInput = {};
    if (params.status) where.status = params.status;

    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return toPaginated(records, totalItems, page, limit);
  }

  /** Đổi trạng thái NEW ↔ HANDLED — check tồn tại để tránh Prisma P2025 */
  async setStatus(id: number, dto: UpdateContactStatusDto) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Không tìm thấy liên hệ');
    return this.prisma.contact.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /** Xóa cứng liên hệ — check tồn tại trước */
  async remove(id: number) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Không tìm thấy liên hệ');
    await this.prisma.contact.delete({ where: { id } });
    return { message: 'Đã xóa liên hệ' };
  }
}
