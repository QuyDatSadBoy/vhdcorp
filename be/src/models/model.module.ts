import { Module } from "@nestjs/common";
import { UserModule } from "@model/user/user.module";


@Module({
  imports: [UserModule],
  exports: [UserModule]
})
export class ModelModule {
}
