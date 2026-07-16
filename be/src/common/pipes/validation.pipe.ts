import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Dịch các message mặc định (tiếng Anh) của class-validator sang tiếng Việt.
 * DTO nào đã khai báo message tiếng Việt riêng thì giữ nguyên (không khớp mẫu).
 */
const VI_PATTERNS: [RegExp, string][] = [
  [/^(\S+) must be an email$/, '$1 phải là email hợp lệ'],
  [/^(\S+) should not be empty$/, '$1 không được để trống'],
  [/^(\S+) must be a string$/, '$1 phải là chuỗi ký tự'],
  [/^(\S+) must be a number.*$/, '$1 phải là số'],
  [/^(\S+) must be an integer number$/, '$1 phải là số nguyên'],
  [/^(\S+) must be a boolean value$/, '$1 phải là true/false'],
  [/^(\S+) must be a URL address$/, '$1 phải là đường dẫn URL hợp lệ'],
  [
    /^(\S+) must be longer than or equal to (\d+) characters$/,
    '$1 tối thiểu $2 ký tự',
  ],
  [
    /^(\S+) must be shorter than or equal to (\d+) characters$/,
    '$1 tối đa $2 ký tự',
  ],
  [/^(\S+) must not be less than (\d+)$/, '$1 không được nhỏ hơn $2'],
  [/^(\S+) must not be greater than (\d+)$/, '$1 không được lớn hơn $2'],
  [
    /^(\S+) must be one of the following values: (.*)$/,
    '$1 phải là một trong các giá trị: $2',
  ],
  [/^(\S+) must be an array$/, '$1 phải là danh sách'],
  [/^property (\S+) should not exist$/, 'Trường $1 không được phép gửi lên'],
  [/^(\S+) must be a Date instance$/, '$1 phải là ngày hợp lệ'],
  [/^(\S+) must be a valid enum value$/, '$1 không phải giá trị hợp lệ'],
];

function viTranslate(message: string): string {
  for (const [re, replacement] of VI_PATTERNS) {
    if (re.test(message)) return message.replace(re, replacement);
  }
  return message;
}

export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    // whitelist: strip mọi property không khai báo trong DTO → chặn mass-assignment vào Prisma
    const errors = await validate(object, {
      whitelist: true,
      forbidUnknownValues: false,
    });
    if (errors.length > 0) {
      throw new BadRequestException(this.flattenErrors(errors).join(' \n '));
    }
    // Trả về instance đã được whitelist strip (không trả raw value)
    return object;
  }

  /** Gom message từ cả nested errors — constraints có thể undefined ở node cha */
  private flattenErrors(errors: ValidationError[], prefix = ''): string[] {
    const messages: string[] = [];
    for (const err of errors) {
      const path = prefix ? `${prefix}.${err.property}` : err.property;
      if (err.constraints) {
        messages.push(
          ...Object.values(err.constraints).map((m) => {
            const translated = viTranslate(m);
            return prefix ? `${path}: ${translated}` : translated;
          }),
        );
      }
      if (err.children?.length) {
        messages.push(...this.flattenErrors(err.children, path));
      }
    }
    return messages;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
