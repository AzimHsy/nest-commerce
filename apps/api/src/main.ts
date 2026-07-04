import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true exposes req.rawBody (the exact received bytes) so the payment
  // webhook can verify its HMAC signature over the untouched payload.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();

  // Security headers (Spring analogy: the defaults Spring Security applies).
  app.use(helmet());

  // CORS: only the storefront origin(s) may call from a browser.
  const config = app.get(ConfigService);
  const origins = (
    config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000'
  ).split(',');
  app.enableCors({ origin: origins });

  // Canonical Nest input validation: reject unknown fields, strip them, and
  // transform payloads into DTO instances. Applies to every endpoint.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(config.get<number>('PORT') ?? 4000);
}
void bootstrap();
