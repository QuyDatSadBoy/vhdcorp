import { PipeTransform, Injectable } from "@nestjs/common";

@Injectable()
export class DefaultPageNumberPipe implements PipeTransform {
  transform(value: string, _metadata: any): number {
    let parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue < 0) {
      parsedValue = 1;
    }
    // console.log("PPPPPPPPPPP")
    // console.log(parsedValue);
    return parsedValue;
  }
}