import { Module } from "@nestjs/common";
import { CsrfService } from "@service/csrf/csrf.service";


@Module({
  providers: [CsrfService],
  exports: [CsrfService],
})
export class CsrfModule {}
