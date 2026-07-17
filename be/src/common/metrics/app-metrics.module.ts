import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppMetricsService } from './app-metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';

/** Global: AppMetricsService inject được mọi nơi; interceptor đếm mọi request */
@Global()
@Module({
  providers: [
    AppMetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [AppMetricsService],
})
export class AppMetricsModule {}
