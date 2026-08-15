import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { DatabaseService } from './database/database.service';
import { QueuesService, type EnqueuedJob } from './queues/queues.service';
import { RedisService } from './redis/redis.service';

interface HealthResponse {
  status: 'ok';
  service: 'clinic-api';
  database: {
    status: 'ok';
  };
  redis: {
    status: 'ok';
  };
}

@Controller()
export class AppController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly queuesService: QueuesService,
  ) {}

  @Get()
  getRoot(): string {
    return 'clinic-api';
  }

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.databaseService.health(),
      this.redisService.health(),
    ]);

    return {
      status: 'ok',
      service: 'clinic-api',
      database,
      redis,
    };
  }

  @Post('system/jobs/health')
  @UseGuards(JwtAuthGuard)
  async enqueueSystemHealthCheck(): Promise<{ status: 'queued'; job: EnqueuedJob }> {
    const job = await this.queuesService.enqueueSystemHealthCheck();

    return {
      status: 'queued',
      job,
    };
  }
}
