import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

export interface SignedUploadParams {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
}

/**
 * CloudinaryService — sinh signed upload params cho FE upload trực tiếp,
 * và xóa asset khi cần. Toàn bộ secret ở BE, FE chỉ nhận signature ngắn hạn.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.config.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.config.get<string>("CLOUDINARY_API_SECRET"),
      secure: true,
    });
  }

  /** Sinh params có signature để FE post trực tiếp lên Cloudinary */
  signUploadParams(folder: string, publicId?: string): SignedUploadParams {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = { timestamp, folder };
    if (publicId) paramsToSign.public_id = publicId;

    const apiSecret = this.config.get<string>("CLOUDINARY_API_SECRET") ?? "";
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      apiKey: this.config.get<string>("CLOUDINARY_API_KEY") ?? "",
      cloudName: this.config.get<string>("CLOUDINARY_CLOUD_NAME") ?? "",
      timestamp,
      signature,
      folder,
      publicId,
    };
  }

  async destroy(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      this.logger.error(`Cloudinary destroy failed: ${publicId}`, error);
      return false;
    }
  }

  async upload(buffer: Buffer, options: UploadApiOptions): Promise<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format: string;
    bytes: number;
  }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
        if (err || !result) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      });
      stream.end(buffer);
    });
  }
}
