import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProviderModule } from "@provider/provider.module";
import { ModelModule } from "@model/model.module";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/exceptions/http-exception.filter";
import { ValidationPipe } from "@pipe/validation.pipe";
import { TransformInterceptor } from "@interceptor/transform.interceptor";
import { AuthenticationModule } from "@authentication/authentication.module";
import { SanitizeHtmlInterceptor } from "@interceptor/sanitize-html.interceptor";
import { ThrottlerGuard } from "@nestjs/throttler";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProviderModule,
    ModelModule,
    AuthenticationModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeHtmlInterceptor
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {
}
