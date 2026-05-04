import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule, ConfigService } from "@nestjs/config";


@Module({
  imports: [ThrottlerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => [
      {
        ttl: +config.getOrThrow('THROTTLE_TTL'),
        limit: +config.getOrThrow('THROTTLE_LIMIT'),
      },
    ],
  }),]
})
export class ThrottleProvider {
}