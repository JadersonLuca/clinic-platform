import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';

interface SaveZApiConnectionBody {
  name?: unknown;
  instanceId?: unknown;
  token?: unknown;
  clientToken?: unknown;
}

interface SendConversationTextBody {
  message?: unknown;
  replyToMessageId?: unknown;
}

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('connections')
  listConnections(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listConnections(user);
  }

  @Get('connections/primary-whatsapp')
  getPrimaryWhatsappConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getPrimaryWhatsappConnection(user);
  }

  @Post('connections/zapi')
  saveZApiConnection(@CurrentUser() user: AuthenticatedUser, @Body() body: SaveZApiConnectionBody) {
    if (
      typeof body.name !== 'string' ||
      (body.instanceId !== undefined && typeof body.instanceId !== 'string') ||
      (body.token !== undefined && typeof body.token !== 'string') ||
      (body.clientToken !== undefined && typeof body.clientToken !== 'string')
    ) {
      throw new BadRequestException('name and Z-API credentials are required');
    }

    return this.messagingService.saveZApiConnection(user, {
      name: body.name,
      instanceId: body.instanceId,
      token: body.token,
      clientToken: body.clientToken,
    });
  }

  @Post('connections/:connectionId/status')
  refreshStatus(@CurrentUser() user: AuthenticatedUser, @Param('connectionId') connectionId: string) {
    return this.messagingService.refreshStatus(user, connectionId);
  }

  @Post('connections/:connectionId/qr-code')
  getQrCode(@CurrentUser() user: AuthenticatedUser, @Param('connectionId') connectionId: string) {
    return this.messagingService.getQrCode(user, connectionId);
  }

  @Post('connections/:connectionId/disconnect')
  disconnectConnection(@CurrentUser() user: AuthenticatedUser, @Param('connectionId') connectionId: string) {
    return this.messagingService.disconnectConnection(user, connectionId);
  }

  @Delete('connections/:connectionId')
  deleteConnection(@CurrentUser() user: AuthenticatedUser, @Param('connectionId') connectionId: string) {
    return this.messagingService.deleteConnection(user, connectionId);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listConversations(user);
  }

  @Get('conversations/:conversationId/messages')
  listMessages(@CurrentUser() user: AuthenticatedUser, @Param('conversationId') conversationId: string) {
    return this.messagingService.listMessages(user, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  sendText(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() body: SendConversationTextBody,
  ) {
    if (
      typeof body.message !== 'string' ||
      (body.replyToMessageId !== undefined && typeof body.replyToMessageId !== 'string')
    ) {
      throw new BadRequestException('message is required');
    }

    return this.messagingService.sendConversationText(user, {
      conversationId,
      message: body.message,
      replyToMessageId: body.replyToMessageId,
    });
  }
}
