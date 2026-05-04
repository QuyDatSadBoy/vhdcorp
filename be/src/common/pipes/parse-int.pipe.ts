import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class ParseIntegerPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val: number = parseInt(value, 10);
    console.log(value);
    if (isNaN(val)) {
      throw new BadRequestException("Cannot parse integer");
    }
    return val;
  }
}