import { ArgumentMetadata, BadRequestException, PipeTransform } from "@nestjs/common";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      // Get error messages
      const errorMessage: string = errors.reduce((accumulator, currentValue) =>
          accumulator.concat(Object.values(currentValue.constraints).map((err => err.toString() + " \n ")).toString())
        , ``);
      throw new BadRequestException(errorMessage);
    }
    return value;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

}