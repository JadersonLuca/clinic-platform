import { Queue } from 'bullmq';
import type Redis from 'ioredis';

export const SYSTEM_HEALTH_QUEUE = 'system.health';
export const SYSTEM_HEALTH_JOB = 'system.health.check';

export interface SystemHealthJobData {
  requestedAt: string;
  source: 'api';
}

export function createSystemHealthQueue(connection: Redis): Queue<SystemHealthJobData> {
  return new Queue<SystemHealthJobData>(SYSTEM_HEALTH_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1_000,
      },
      removeOnComplete: {
        age: 60 * 60,
        count: 100,
      },
      removeOnFail: {
        age: 24 * 60 * 60,
        count: 500,
      },
    },
  });
}
