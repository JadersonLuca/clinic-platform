import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('ClinicWorker');

  logger.log('Clinic Worker iniciado');

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.log(`Encerrando Clinic Worker por ${signal}`);
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', (signal) => void shutdown(signal));
  process.once('SIGTERM', (signal) => void shutdown(signal));

  setInterval(() => undefined, 60_000);
}

void bootstrap();
