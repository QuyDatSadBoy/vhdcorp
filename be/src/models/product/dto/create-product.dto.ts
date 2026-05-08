import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ProductStatus } from "@vhd/prisma-client";

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  images!: string[];

  @IsInt()
  categoryId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDesc?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
