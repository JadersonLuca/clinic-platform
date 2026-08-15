import {
  createQueueRedisConnection,
  createSystemHealthQueue,
  SYSTEM_HEALTH_JOB,
  type SystemHealthJobData,
} from '@clinic/queues';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type Redis from 'ioredis';

export interface EnqueuedJob {
  id: string;
  queue: string;
  name: string;
}

@Injectable()
export class QueuesService implements OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private readonly connection: Redis;
  private readonly systemHealthQueue: Queue<SystemHealthJobData>;

  constructor() {
    this.connection = createQueueRedisConnection();
    this.systemHealthQueue = createSystemHealthQueue(this.connection);
  }

  async enqueueSystemHealthCheck(): Promise<EnqueuedJob> {
    const job = await this.systemHealthQueue.add(
      SYSTEM_HEALTH_JOB,
      {
        requestedAt: new Date().toISOString(),
        source: 'api',
      },
      {
        jobId: `system-health-${Date.now()}`,
      },
    );

    this.logger.log(`Enqueued ${SYSTEM_HEALTH_JOB} job ${job.id}`);

    return {
      id: String(job.id),
      queue: this.systemHealthQueue.name,
      name: job.name,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.systemHealthQueue.close();
    this.connection.disconnect();
  }
}
