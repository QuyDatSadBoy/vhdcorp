import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { OrderStatus, Role } from '@vhd/prisma-client';

@Controller('orders')
@ApiTags('Order')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  /** Đặt hàng — BẮT BUỘC đăng nhập (thêm giỏ thì không); đơn gắn vào tài khoản để theo dõi */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = req.user as { sub: number };
    return this.service.create(dto, user.sub);
  }

  /** Đơn hàng của chính khách đang đăng nhập */
  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: Request) {
    const user = req.user as { sub: number };
    return this.service.myOrders(user.sub);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Put(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }
}
