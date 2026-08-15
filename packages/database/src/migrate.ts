import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase, createPostgresPool } from './postgres';

async function main(): Promise<void> {
  const pool = createPostgresPool();
  const db = createDatabase(pool);

  try {
    await migrate(db, {
      migrationsFolder: './drizzle',
    });
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
