import { createDatabase, createPostgresPool, type Database } from '@clinic/database';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Pool } from 'pg';

export interface DatabaseHealth {
  status: 'ok';
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  readonly db: Database;

  constructor() {
    this.pool = createPostgresPool();
    this.db = createDatabase(this.pool);

    this.pool.on('error', (error) => {
      this.logger.error('Unexpected PostgreSQL pool error', error.stack);
    });
  }

  async health(): Promise<DatabaseHealth> {
    await this.db.execute(sql`select 1`);

    return {
      status: 'ok',
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
