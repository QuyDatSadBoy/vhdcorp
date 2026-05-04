import { PipeTransform, Injectable } from "@nestjs/common";

@Injectable()
export class DefaultPageSizePipe implements PipeTransform {
  transform(value: string, _metadata: any): number {
    let parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue < 0) {
      parsedValue = 16;
    }
    return parsedValue;
  }
}