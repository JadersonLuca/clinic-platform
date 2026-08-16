import { Body, Controller, Param, Post } from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Controller()
export class MessagingWebhookController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('webhook-whatsapp')
  handleUnifiedWebhook(@Body() body: unknown) {
    return this.messagingService.handleWhatsappWebhook(body);
  }

  @Post('zapi')
  handleDedicatedZApiWebhook(@Body() body: unknown) {
    return this.messagingService.handleWhatsappWebhook(body, 'zapi');
  }

  @Post('webhooks/zapi/connection')
  handleConnectionWebhook(@Body() body: unknown) {
    return this.messagingService.handleZApiConnectionWebhook(body);
  }

  @Post('webhooks/zapi/connections/:connectionId/connection')
  handleConnectionWebhookForConnection(@Param('connectionId') connectionId: string, @Body() body: unknown) {
    return this.messagingService.handleZApiConnectionWebhook(body, connectionId);
  }
}
