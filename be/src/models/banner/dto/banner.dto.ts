import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateBannerDto {
  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @IsString()
  @MaxLength(60)
  position!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

import { PartialType } from "@nestjs/mapped-types";
export class UpdateBannerDto extends PartialType(CreateBannerDto) {}
