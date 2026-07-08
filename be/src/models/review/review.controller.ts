import {
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  UpdateReviewStatusDto,
} from './dto/review.dto';
import { JwtAuthGuard } from '@guard/jwt-auth.guard';
import { RolesGuard } from '@guard/roles.guard';
import { Roles } from '@decorator/roles.decorator';
import { Public } from '@decorator/public.decorator';
import { CurrentUser } from '@decorator/current-user.decorator';
import { ReviewStatus, Role } from '@vhd/prisma-client';

@Controller('reviews')
@ApiTags('Review')
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  @Get('product/:slug')
  @Public()
  forProduct(@Param('slug') slug: string) {
    return this.service.listForProduct(slug);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  adminList(
    @Query('pageNumber') pageNumber?: string,
    @Query('pageSize') pageSize?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ReviewStatus,
    @Query('productId') productId?: string,
  ) {
    return this.service.adminList({
      pageNumber,
      pageSize,
      page,
      limit,
      status,
      productId: productId ? Number(productId) : undefined,
    });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { sub: number }, @Body() dto: CreateReviewDto) {
    return this.service.create(user.sub, dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { sub: number },
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.update(id, user.sub, dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.service.setStatus(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
