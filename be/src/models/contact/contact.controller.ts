import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { Public } from '@decorator/public.decorator';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { ContactStatus, Role } from '@vhd/prisma-client';

@Controller('contact')
@ApiTags('Contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /** Public — khách gửi liên hệ (throttle global đã áp dụng) */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: CreateContactDto) {
    return this.contactService.submit(dto);
  }

  /** Admin/Staff — hộp thư liên hệ, phân trang + filter status */
  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  adminList(
    @Query('pageNumber') pageNumber?: string,
    @Query('pageSize') pageSize?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ContactStatus,
  ) {
    return this.contactService.adminList({
      pageNumber,
      pageSize,
      page,
      limit,
      status,
    });
  }

  /** Admin/Staff — đổi trạng thái NEW ↔ HANDLED */
  @Put(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactService.setStatus(id, dto);
  }

  /** Admin — xóa cứng liên hệ */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contactService.remove(id);
  }
}
