import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: getCorsOrigin(),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

function getCorsOrigin(): boolean | string[] {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (!corsOrigin) {
    return true;
  }

  return corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
}

void bootstrap();
