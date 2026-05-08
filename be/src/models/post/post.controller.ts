import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post as HttpPost,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PostService } from "./post.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { RolesGuard } from "@guard/roles.guard";
import { Roles } from "@decorator/roles.decorator";
import { Public } from "@decorator/public.decorator";
import { CurrentUser } from "@decorator/current-user.decorator";
import { PostStatus, Role } from "@vhd/prisma-client";

@Controller("posts")
@ApiTags("Post")
export class PostController {
  constructor(private readonly service: PostService) {}

  @Get()
  @Public()
  list(
    @Query("pageNumber") pageNumber?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("tag") tag?: string,
  ) {
    return this.service.list({ pageNumber, pageSize, search, tag, publishedOnly: true });
  }

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  adminList(
    @Query("pageNumber") pageNumber?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("status") status?: PostStatus,
  ) {
    return this.service.list({ pageNumber, pageSize, search, status });
  }

  @Get("slug/:slug")
  @Public()
  bySlug(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  byId(@Param("id", ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @HttpPost()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreatePostDto, @CurrentUser() user: { sub: number }) {
    return this.service.create(dto, user.sub);
  }

  @Put(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }

  @HttpPost(":id/restore")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  restore(@Param("id", ParseIntPipe) id: number) {
    return this.service.restore(id);
  }
}
