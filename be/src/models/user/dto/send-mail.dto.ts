import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendMailDto {
  /** Danh sách id người nhận (bỏ trống → gửi mọi user đang hoạt động, tối đa 200) */
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(200, { message: 'Tối đa 200 người nhận mỗi lần gửi' })
  @IsOptional()
  userIds?: number[];

  @IsString()
  @MinLength(3, { message: 'Tiêu đề tối thiểu 3 ký tự' })
  @MaxLength(200)
  subject!: string;

  /** Nội dung HTML — hỗ trợ biến {{name}} và {{email}} (thay theo từng người nhận) */
  @IsString()
  @MinLength(10, { message: 'Nội dung tối thiểu 10 ký tự' })
  @MaxLength(100_000)
  html!: string;
}
