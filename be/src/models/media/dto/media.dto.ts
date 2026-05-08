import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class SignUploadDto {
  @IsString()
  @MaxLength(120)
  folder!: string;

  @IsOptional()
  @IsString()
  publicId?: string;
}

export class CreateMediaDto {
  @IsString()
  url!: string;

  @IsString()
  publicId!: string;

  @IsString()
  folder!: string;

  @IsString()
  format!: string;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  bytes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];
}
