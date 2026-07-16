import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsOptional, IsString, Length } from 'class-validator';
import { Public } from '@decorator/public.decorator';
import { TrackService } from './track.service';

class TrackViewDto {
  @IsInt()
  productId!: number;

  /** UUID phiên khách (localStorage) — nhận diện hành vi không cần đăng nhập */
  @IsString()
  @Length(8, 64)
  sessionId!: string;

  @IsInt()
  @IsOptional()
  userId?: number;
}

/** Tracking hành vi khách (public, throttled) — nền tảng recommendation + báo cáo */
@Controller('track')
@ApiTags('Tracking')
export class TrackController {
  constructor(private readonly service: TrackService) {}

  @Public()
  @Post('view')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async view(@Body() dto: TrackViewDto) {
    return this.service.recordView(dto.productId, dto.sessionId, dto.userId);
  }
}
