import { Module } from "@nestjs/common";

import { JwtProvider } from "@provider/jwt.provider";
import { ThrottleProvider } from "@provider/throttle.provider";

@Module({
  imports: [ThrottleProvider, JwtProvider],
  exports: [ThrottleProvider, JwtProvider]
})
export class ProviderModule {
}
