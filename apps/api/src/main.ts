import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true exposes req.rawBody (the exact received bytes) so the payment
  // webhook can verify its HMAC signature over the untouched payload.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();

  // Canonical Nest input validation: reject unknown fields, strip them, and
  // transform payloads into DTO instances. Applies to every endpoint.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);
  await app.listen(config.get<number>('PORT') ?? 4000);
}
void bootstrap();
