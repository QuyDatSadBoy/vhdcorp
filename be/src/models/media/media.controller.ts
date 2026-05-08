import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { MediaService } from "./media.service";
import { CreateMediaDto, SignUploadDto } from "./dto/media.dto";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { RolesGuard } from "@guard/roles.guard";
import { Roles } from "@decorator/roles.decorator";
import { CurrentUser } from "@decorator/current-user.decorator";
import { Role } from "@vhd/prisma-client";

@Controller("media")
@ApiTags("Media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Post("sign")
  @Roles(Role.ADMIN, Role.STAFF)
  signUpload(@Body() dto: SignUploadDto) {
    return this.service.signUpload(dto);
  }

  /**
   * Server-side upload: admin chọn file → BE đẩy lên Cloudinary → lưu Media record.
   * UX tốt nhất: admin không phải dán URL. Giới hạn 10MB, chỉ image/*.
   */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        folder: { type: "string" },
      },
    },
  })
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif|svg\+xml)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body("folder") folder: string | undefined,
    @CurrentUser() user: { sub: number; role?: Role },
  ) {
    if (!file) throw new BadRequestException("Thiếu file");
    // Customer chỉ được upload vào folder "avatars" (avatar cá nhân)
    const isPrivileged = user.role === Role.ADMIN || user.role === Role.STAFF;
    const safeFolder = isPrivileged ? (folder ?? "vhdcorp") : "avatars";
    return this.service.uploadFile(file, safeFolder, user.sub);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  list(
    @Query("pageNumber") pageNumber?: string,
    @Query("pageSize") pageSize?: string,
    @Query("folder") folder?: string,
    @Query("tag") tag?: string,
  ) {
    return this.service.list({ pageNumber, pageSize, folder, tag });
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateMediaDto, @CurrentUser() user: { sub: number }) {
    return this.service.create(dto, user.sub);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
