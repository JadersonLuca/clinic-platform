import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { MessagingModule } from './messaging/messaging.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [DatabaseModule, RedisModule, QueuesModule, AuthModule, MessagingModule, TeamModule, JwtModule.register({})],
  controllers: [AppController],
})
export class AppModule {}
