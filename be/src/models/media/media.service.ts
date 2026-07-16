import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma/prisma.service';
import { CloudinaryService } from '@service/cloudinary/cloudinary.service';
import { CreateMediaDto, SignUploadDto } from './dto/media.dto';
import { buildPaginationParams, toPaginated } from '@util/pagination';
import type { Prisma } from '@vhd/prisma-client';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private config: ConfigService,
  ) {}

  signUpload(dto: SignUploadDto) {
    return this.cloudinary.signUploadParams(dto.folder, dto.publicId);
  }

  /** Server-side upload — đẩy buffer lên Cloudinary, fallback local nếu thiếu credentials. */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    uploadedBy: number,
    opts: { persistToLibrary?: boolean } = {},
  ) {
    // Avatar khách upload KHÔNG ghi vào Thư viện ảnh của admin — chỉ trả URL
    const persistToLibrary = opts.persistToLibrary ?? true;
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    const useCloudinary = cloudName && apiSecret;

    if (useCloudinary) {
      try {
        const result = await this.cloudinary.upload(file.buffer, {
          folder,
          resource_type: 'image',
        });
        const record = {
          url: result.url,
          publicId: result.publicId,
          folder,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          uploadedBy,
        };
        return persistToLibrary ? this.persist(record) : record;
      } catch (err) {
        this.logger.warn(
          `Cloudinary upload failed, fallback local: ${(err as Error).message}`,
        );
      }
    }

    // ─── Local fallback ───
    const ext =
      extname(file.originalname || '') ||
      `.${file.mimetype.split('/')[1] ?? 'bin'}`;
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    const dir = join(process.cwd(), 'uploads', folder);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), file.buffer);

    const apiUrl =
      this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:8080';
    const url = `${apiUrl}/uploads/${folder}/${filename}`;
    const localRecord = {
      url,
      publicId: `local/${folder}/${filename}`,
      folder,
      format: ext.replace('.', ''),
      bytes: file.size,
      uploadedBy,
    };
    return persistToLibrary ? this.persist(localRecord) : localRecord;
  }

  private persist(data: {
    url: string;
    publicId: string;
    folder: string;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    uploadedBy: number;
  }) {
    return this.prisma.media.create({
      data: {
        url: data.url,
        publicId: data.publicId,
        folder: data.folder,
        format: data.format,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        tags: [],
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async list(params: {
    pageNumber?: string;
    pageSize?: string;
    page?: string;
    limit?: string;
    folder?: string;
    tag?: string;
  }) {
    const { page, limit, skip, take } = buildPaginationParams(
      params.pageNumber,
      params.pageSize,
      params.page,
      params.limit,
    );
    const where: Prisma.MediaWhereInput = {};
    if (params.folder) where.folder = params.folder;
    if (params.tag) where.tags = { has: params.tag };

    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count({ where }),
    ]);
    return toPaginated(records, totalItems, page, limit);
  }

  /** Lưu metadata sau khi FE upload xong lên Cloudinary */
  create(dto: CreateMediaDto, uploadedBy: number) {
    return this.prisma.media.create({
      data: {
        url: dto.url,
        publicId: dto.publicId,
        folder: dto.folder,
        format: dto.format,
        width: dto.width,
        height: dto.height,
        bytes: dto.bytes,
        tags: dto.tags ?? [],
        uploadedBy,
      },
    });
  }

  async remove(id: number) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Không tìm thấy media');
    await this.cloudinary.destroy(media.publicId);
    await this.prisma.media.delete({ where: { id } });
    return { success: true };
  }
}
