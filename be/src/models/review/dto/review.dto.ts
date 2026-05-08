import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { ReviewStatus } from "@vhd/prisma-client";

export class CreateReviewDto {
  @IsInt()
  productId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content!: string;
}

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content?: string;
}
