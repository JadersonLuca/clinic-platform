import {
  createQueueRedisConnection,
  SYSTEM_HEALTH_JOB,
  SYSTEM_HEALTH_QUEUE,
  type SystemHealthJobData,
} from '@clinic/queues';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import type Redis from 'ioredis';

@Injectable()
export class SystemHealthProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemHealthProcessor.name);
  private readonly connection: Redis;
  private readonly worker: Worker<SystemHealthJobData>;

  constructor() {
    this.connection = createQueueRedisConnection();
    this.worker = new Worker<SystemHealthJobData>(
      SYSTEM_HEALTH_QUEUE,
      async (job) => this.process(job),
      {
        connection: this.connection,
        concurrency: Number(process.env.SYSTEM_HEALTH_WORKER_CONCURRENCY ?? 2),
      },
    );
  }

  onModuleInit(): void {
    this.worker.on('completed', (job) => {
      this.logger.log(`Completed ${job.name} job ${job.id}`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Failed ${job?.name ?? SYSTEM_HEALTH_JOB} job ${job?.id ?? 'unknown'}`, error.stack);
    });

    this.logger.log(`Listening to ${SYSTEM_HEALTH_QUEUE} queue`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
    this.connection.disconnect();
  }

  private async process(job: Job<SystemHealthJobData>): Promise<{ processedAt: string }> {
    if (job.name !== SYSTEM_HEALTH_JOB) {
      throw new Error(`Unsupported job name: ${job.name}`);
    }

    this.logger.log(`Processing ${job.name} job ${job.id}`);

    return {
      processedAt: new Date().toISOString(),
    };
  }
}
