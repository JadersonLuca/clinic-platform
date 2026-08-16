import { Body, Controller, Param, Post } from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Controller('webhooks/zapi')
export class MessagingWebhookController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('connection')
  handleConnectionWebhook(@Body() body: unknown) {
    return this.messagingService.handleZApiConnectionWebhook(body);
  }

  @Post('connections/:connectionId/connection')
  handleConnectionWebhookForConnection(@Param('connectionId') connectionId: string, @Body() body: unknown) {
    return this.messagingService.handleZApiConnectionWebhook(body, connectionId);
  }
}
