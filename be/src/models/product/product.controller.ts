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
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { RolesGuard } from "@guard/roles.guard";
import { Roles } from "@decorator/roles.decorator";
import { Public } from "@decorator/public.decorator";
import { ProductStatus, Role } from "@vhd/prisma-client";

@Controller("products")
@ApiTags("Product")
export class ProductController {
  constructor(private readonly service: ProductService) {}

  /** Public — chỉ trả PUBLISHED */
  @Get()
  @Public()
  list(
    @Query("pageNumber") pageNumber?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("categorySlug") categorySlug?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sort") sort?: "newest" | "price_asc" | "price_desc" | "name",
  ) {
    return this.service.list({
      pageNumber,
      pageSize,
      search,
      categorySlug,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      publishedOnly: true,
    });
  }

  /** Admin/Staff list — bao gồm DRAFT */
  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  adminList(
    @Query("pageNumber") pageNumber?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("status") status?: ProductStatus,
    @Query("categoryId") categoryId?: string,
  ) {
    return this.service.list({
      pageNumber,
      pageSize,
      search,
      status,
      categoryId: categoryId ? Number(categoryId) : undefined,
    });
  }

  @Get("slug/:slug")
  @Public()
  bySlug(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(":id/related")
  @Public()
  related(@Param("id", ParseIntPipe) id: number) {
    return this.service.related(id);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  byId(@Param("id", ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }

  @Post(":id/restore")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  restore(@Param("id", ParseIntPipe) id: number) {
    return this.service.restore(id);
  }
}
