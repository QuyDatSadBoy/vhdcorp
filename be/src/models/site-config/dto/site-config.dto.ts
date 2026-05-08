import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ConfigStatus } from "@vhd/prisma-client";

export class UpdateSiteConfigDto {
  @IsObject()
  value!: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ConfigStatus)
  status?: ConfigStatus;
}

export class PublishConfigDto {
  @IsString()
  key!: string;
}
