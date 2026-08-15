import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

export interface DatabaseHealth {
  status: 'ok';
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 5_000),
    });

    this.pool.on('error', (error) => {
      this.logger.error('Unexpected PostgreSQL pool error', error.stack);
    });
  }

  async health(): Promise<DatabaseHealth> {
    await this.pool.query('select 1');

    return {
      status: 'ok',
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
