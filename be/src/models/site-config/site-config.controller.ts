import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SiteConfigService } from "./site-config.service";
import { UpdateSiteConfigDto } from "./dto/site-config.dto";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { RolesGuard } from "@guard/roles.guard";
import { Roles } from "@decorator/roles.decorator";
import { Public } from "@decorator/public.decorator";
import { CurrentUser } from "@decorator/current-user.decorator";
import { Role } from "@vhd/prisma-client";

@Controller("site-config")
@ApiTags("SiteConfig")
export class SiteConfigController {
  constructor(private readonly service: SiteConfigService) {}

  @Get()
  @Public()
  getPublic(@Query("key") key?: string) {
    return this.service.getPublished(key ?? "main");
  }

  @Get("draft")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  getDraft(@Query("key") key: string | undefined, @CurrentUser() user: { sub: number }) {
    return this.service.getDraft(key ?? "main", user.sub);
  }

  @Put("draft")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  saveDraft(
    @Query("key") key: string | undefined,
    @CurrentUser() user: { sub: number },
    @Body() dto: UpdateSiteConfigDto,
  ) {
    return this.service.saveDraft(key ?? "main", user.sub, dto);
  }

  @Post("publish")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  publish(@Query("key") key: string | undefined, @CurrentUser() user: { sub: number }) {
    return this.service.publish(key ?? "main", user.sub);
  }

  @Get("history")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  history(@Query("key") key?: string) {
    return this.service.history(key ?? "main");
  }

  @Post("rollback/:historyId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  rollback(
    @Param("historyId", ParseIntPipe) historyId: number,
    @CurrentUser() user: { sub: number },
  ) {
    return this.service.rollback(historyId, user.sub);
  }
}
