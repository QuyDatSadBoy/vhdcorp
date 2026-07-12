import { IsString, MaxLength } from 'class-validator';

export class UpdateKnowledgeDto {
  /**
   * Nội dung knowledge.md (markdown thuần).
   * Đặt tên `markdown` (không phải `content`) để tránh SanitizeHtmlInterceptor
   * encode ký tự markdown (&, <, >…) như với field rich-text HTML.
   */
  @IsString()
  @MaxLength(200_000)
  markdown: string;
}
