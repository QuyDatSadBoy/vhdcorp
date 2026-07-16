import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VoucherService } from './voucher.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  ValidateVoucherDto,
} from './dto/voucher.dto';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { Public } from '@decorator/public.decorator';
import { Role } from '@vhd/prisma-client';

@Controller('vouchers')
@ApiTags('Voucher')
export class VoucherController {
  constructor(private readonly service: VoucherService) {}

  /** Khách nhập mã ở giỏ hàng — chỉ kiểm tra, không trừ lượt */
  @Post('validate')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  validate(@Body() dto: ValidateVoucherDto) {
    return this.service.validate(dto.code, dto.subtotal);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  list() {
    return this.service.list();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateVoucherDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
