import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  async submit(dto: CreateContactDto): Promise<{ message: string }> {
    // Ghi log liên hệ — trong production có thể tích hợp email/CRM
    this.logger.log(
      `Liên hệ mới từ ${dto.name} <${dto.email}>: ${dto.subject}`,
    );
    return { message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.' };
  }
}
