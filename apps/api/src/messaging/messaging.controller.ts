import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
      typeof body.instanceId !== 'string' ||
      (body.token !== undefined && typeof body.token !== 'string') ||
      (body.clientToken !== undefined && typeof body.clientToken !== 'string')
    ) {
      throw new BadRequestException('name, instanceId, token and clientToken are required');
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
}
