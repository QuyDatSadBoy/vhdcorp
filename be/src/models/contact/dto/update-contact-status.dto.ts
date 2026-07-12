import { IsEnum } from 'class-validator';
import { ContactStatus } from '@vhd/prisma-client';

export class UpdateContactStatusDto {
  // Trạng thái xử lý liên hệ: NEW | HANDLED
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}
