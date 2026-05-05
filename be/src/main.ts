import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === "production") {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  app.setGlobalPrefix("api");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("VHD Corp API")
    .setDescription("VHD Corp REST API documentation")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  app.enableCors({
    origin: frontendUrl,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization,X-CSRF-TOKEN",
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'", frontendUrl, "https://api.cloudinary.com"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      frameguard: { action: "deny" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xssFilter: true,
      noSniff: true,
      ieNoOpen: true,
    })
  );

  app.use(cookieParser(process.env.COOKIE_SECRET || ""));

  const port = Number(process.env.PORT) || 8000;
  await app.listen(port);
  console.log(`✓ VHD Corp API listening on http://localhost:${port}/api`);
  console.log(`✓ Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
