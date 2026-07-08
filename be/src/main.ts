import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { mkdirSync } from 'fs';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.setGlobalPrefix('api');

  // Static serve for locally uploaded media (BE storage fallback when no Cloudinary)
  const uploadsDir = join(process.cwd(), 'uploads');
  try {
    mkdirSync(uploadsDir, { recursive: true });
  } catch {
    /* exists */
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('VHD Corp API')
    .setDescription('VHD Corp REST API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // CORS — cho phép tất cả origin. Vì FE gửi cookie (credentials: include) nên
  // không thể dùng "*", phải reflect Origin header. Hành vi tương đương "*".
  app.enableCors({
    origin: (origin, callback) => callback(null, origin ?? true),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-CSRF-TOKEN,X-Requested-With',
    exposedHeaders: 'Content-Disposition',
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:8080'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'", frontendUrl, 'https://api.cloudinary.com'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xssFilter: true,
      noSniff: true,
      ieNoOpen: true,
    }),
  );

  app.use(cookieParser(process.env.COOKIE_SECRET || ''));

  const port = Number(process.env.PORT) || 8000;
  await app.listen(port);
  console.log(`✓ VHD Corp API listening on http://localhost:${port}/api`);
  console.log(`✓ Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
