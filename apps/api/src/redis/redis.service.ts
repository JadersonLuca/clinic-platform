import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisHealth {
  status: 'ok';
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      this.logger.error('Unexpected Redis client error', error.stack);
    });
  }

  async health(): Promise<RedisHealth> {
    const response = await this.client.ping();

    if (response !== 'PONG') {
      throw new Error('Unexpected Redis health response');
    }

    return {
      status: 'ok',
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
