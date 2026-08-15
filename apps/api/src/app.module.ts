import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule, QueuesModule, AuthModule],
  controllers: [AppController],
})
export class AppModule {}
