import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
      global: true,
      secret: configService.getOrThrow('JWT_SECRET'),
      signOptions: { expiresIn: '1d' },
    }),
    global: true,
  })],
})
export class JwtProvider {

}