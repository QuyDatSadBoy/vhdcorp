import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BannerService } from "./banner.service";
import { CreateBannerDto, UpdateBannerDto } from "./dto/banner.dto";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { RolesGuard } from "@guard/roles.guard";
import { Roles } from "@decorator/roles.decorator";
import { Public } from "@decorator/public.decorator";
import { Role } from "@vhd/prisma-client";

@Controller("banners")
@ApiTags("Banner")
export class BannerController {
  constructor(private readonly service: BannerService) {}

  @Get()
  @Public()
  list(@Query("position") position?: string) {
    return this.service.list({ position, activeOnly: true });
  }

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  adminList(@Query("position") position?: string) {
    return this.service.list({ position });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateBannerDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateBannerDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
