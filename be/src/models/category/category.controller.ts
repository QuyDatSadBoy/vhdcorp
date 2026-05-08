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
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { RolesGuard } from "@guard/roles.guard";
import { Roles } from "@decorator/roles.decorator";
import { Public } from "@decorator/public.decorator";
import { Role } from "@vhd/prisma-client";

@Controller("categories")
@ApiTags("Category")
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  @Public()
  list(
    @Query("search") search?: string,
    @Query("parentId") parentId?: string,
    @Query("includeChildren") includeChildren?: string,
  ) {
    const parsedParent =
      parentId === "null" ? null : parentId !== undefined ? Number(parentId) : undefined;
    return this.service.list({
      search,
      parentId: parsedParent,
      includeChildren: includeChildren === "true",
    });
  }

  @Get("tree")
  @Public()
  tree() {
    return this.service.tree();
  }

  @Get("slug/:slug")
  @Public()
  bySlug(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(":id")
  @Public()
  byId(@Param("id", ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
