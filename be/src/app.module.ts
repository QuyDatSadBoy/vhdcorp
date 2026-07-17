import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProviderModule } from '@provider/provider.module';
import { ModelModule } from '@model/model.module';
import { SlugModule } from '@service/slug/slug.module';
import { CloudinaryModule } from '@service/cloudinary/cloudinary.module';
import { AgentModule } from '@service/agent/agent.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { PrismaExceptionFilter } from './common/exceptions/prisma-exception.filter';
import { AllExceptionsFilter } from './common/exceptions/all-exceptions.filter';
import { ValidationPipe } from '@pipe/validation.pipe';
import { TransformInterceptor } from '@interceptor/transform.interceptor';
import { AuthenticationModule } from '@authentication/authentication.module';
import { SanitizeHtmlInterceptor } from '@interceptor/sanitize-html.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { AppMetricsModule } from './common/metrics/app-metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProviderModule,
    SlugModule,
    CloudinaryModule,
    AgentModule,
    ModelModule,
    AuthenticationModule,
    HealthModule,
    AppMetricsModule,
  ],
  controllers: [],
  providers: [
    {
      // Catch-all — đăng ký ĐẦU TIÊN để làm fallback cuối (Nest chọn filter từ cuối lên)
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      // Map Prisma known errors (P2025/P2002/P2003) sang HTTP status đúng,
      // tránh leak 500 khi xoá/cập nhật record không tồn tại.
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeHtmlInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
