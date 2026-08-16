import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MessagingController } from './messaging.controller';
import { MessagingWebhookController } from './messaging-webhook.controller';
import { MessagingService } from './messaging.service';
import { ZApiProvider } from './providers/zapi.provider';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MessagingController, MessagingWebhookController],
  providers: [MessagingService, ZApiProvider],
})
export class MessagingModule {}
