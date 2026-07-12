import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

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
          ...Object.values(err.constraints).map((m) =>
            prefix ? `${path}: ${m}` : m,
          ),
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
