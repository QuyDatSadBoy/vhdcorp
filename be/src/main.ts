import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";


dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const config = new DocumentBuilder()
    .setTitle("CSM API")
    .setDescription("The CMS API description")
    .addBearerAuth()
    .build()
  ;
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization, X-CSRF-TOKEN',
    credentials: true,
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],  // Prevents XSS by restricting sources
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // May include CDN
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"]
      }
    },
    frameguard: { action: "deny" },// Prevents Clickjacking
    hsts: {    // Protects against MITM (Strict Transport Security)
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true // Enables HSTS preload header
    },
    // dnsPrefetchControl: {  // Prevents DNS Prefetch attacks
    //   allow: false
    // },
    xssFilter: true, // Enables XSS protection in some browsers.
    noSniff: true, // Prevents MIME sniffing attacks.
    ieNoOpen: true // Prevents old IE versions from executing downloads
  }));

  app.use(cookieParser(process.env.COOKIE_SECRET || ""));

  await app.listen(process.env.PORT);
}

bootstrap().then(() => {
  console.log("App is running on port " + process.env.PORT);
});
