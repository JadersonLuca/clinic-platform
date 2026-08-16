import {
  messagingConnections,
  messagingConversations,
  messagingMessages,
  messagingWebhookEvents,
} from '@clinic/database';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ZApiProvider } from './providers/zapi.provider';
import type {
  MessagingConnectionStatus,
  MessagingConnectionView,
  MessagingConversationView,
  MessagingMessageStatus,
  MessagingMessageType,
  MessagingMessageView,
  MessagingProvider,
  ProviderSendTextPayload,
  SaveZApiConnectionInput,
  SendConversationTextInput,
  ZApiCredentials,
} from './messaging.types';

type MessagingConnectionRow = typeof messagingConnections.$inferSelect;
type MessagingConversationRow = typeof messagingConversations.$inferSelect;
type MessagingMessageRow = typeof messagingMessages.$inferSelect;
type StoredZApiCredentials = ZApiCredentials & Record<string, string>;

interface NormalizedWebhook {
  _provider: MessagingProvider;
  event: 'connection.update' | 'messages.upsert' | 'messages.update';
  instance: string;
  timestamp: number;
  data: Record<string, unknown>;
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly zApiProvider: ZApiProvider,
  ) {}

  async listConnections(user: AuthenticatedUser): Promise<{ connections: MessagingConnectionView[] }> {
    const rows = await this.databaseService.db
      .select()
      .from(messagingConnections)
      .where(eq(messagingConnections.tenantId, user.tenantId))
      .orderBy(desc(messagingConnections.createdAt));

    return {
      connections: rows.map((row) => this.toConnectionView(row)),
    };
  }

  async getPrimaryWhatsappConnection(user: AuthenticatedUser): Promise<{ connection: MessagingConnectionView | null }> {
    const row = await this.findPrimaryWhatsappConnection(user.tenantId);

    return {
      connection: row ? this.toConnectionView(row) : null,
    };
  }

  async saveZApiConnection(
    user: AuthenticatedUser,
    input: SaveZApiConnectionInput,
  ): Promise<{ connection: MessagingConnectionView }> {
    const existing = await this.findPrimaryWhatsappConnection(user.tenantId);
    const credentials = this.normalizeZApiCredentials(input, existing?.credentials);
    const now = new Date();

    if (existing) {
      const [row] = await this.databaseService.db
        .update(messagingConnections)
        .set({
          name: input.name.trim(),
          provider: 'zapi',
          externalInstanceId: credentials.instanceId,
          credentials,
          status: 'disconnected',
          lastError: null,
          lastStatusAt: now,
          updatedAt: now,
        })
        .where(and(eq(messagingConnections.id, existing.id), eq(messagingConnections.tenantId, user.tenantId)))
        .returning();

      return this.refreshStatus(user, row.id);
    }

    const [row] = await this.databaseService.db
      .insert(messagingConnections)
      .values({
        tenantId: user.tenantId,
        organizationId: user.organizationId,
        name: input.name.trim(),
        channel: 'whatsapp',
        provider: 'zapi',
        externalInstanceId: credentials.instanceId,
        credentials,
        status: 'disconnected',
        lastStatusAt: now,
      })
      .returning();

    return this.refreshStatus(user, row.id);
  }

  async refreshStatus(user: AuthenticatedUser, connectionId: string): Promise<{ connection: MessagingConnectionView }> {
    const connection = await this.findTenantConnection(user.tenantId, connectionId);
    const credentials = this.readZApiCredentials(connection);

    try {
      const status = await this.zApiProvider.getStatus(credentials);

      const [row] = await this.databaseService.db
        .update(messagingConnections)
        .set({
          status: status.status,
          connectedPhone: status.connectedPhone ?? connection.connectedPhone,
          lastError: status.connected ? null : (status.error ?? null),
          lastStatusAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(messagingConnections.id, connection.id), eq(messagingConnections.tenantId, user.tenantId)))
        .returning();

      return { connection: this.toConnectionView(row) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh provider status';
      const [row] = await this.databaseService.db
        .update(messagingConnections)
        .set({
          status: 'error',
          lastError: message,
          lastStatusAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(messagingConnections.id, connection.id), eq(messagingConnections.tenantId, user.tenantId)))
        .returning();

      return { connection: this.toConnectionView(row) };
    }
  }

  async getQrCode(user: AuthenticatedUser, connectionId: string): Promise<{ qrCode: string }> {
    const connection = await this.findTenantConnection(user.tenantId, connectionId);
    const credentials = this.readZApiCredentials(connection);
    const qrCode = await this.zApiProvider.getQrCode(credentials);

    await this.databaseService.db
      .update(messagingConnections)
      .set({
        status: 'qr_pending',
        lastError: null,
        lastStatusAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(messagingConnections.id, connection.id), eq(messagingConnections.tenantId, user.tenantId)));

    return {
      qrCode: qrCode.value,
    };
  }

  async disconnectConnection(user: AuthenticatedUser, connectionId: string): Promise<{ connection: MessagingConnectionView }> {
    const connection = await this.findTenantConnection(user.tenantId, connectionId);
    const credentials = this.readZApiCredentials(connection);

    try {
      await this.zApiProvider.disconnect(credentials);

      const [row] = await this.databaseService.db
        .update(messagingConnections)
        .set({
          status: 'disconnected',
          connectedPhone: null,
          lastError: null,
          lastStatusAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(messagingConnections.id, connection.id), eq(messagingConnections.tenantId, user.tenantId)))
        .returning();

      return { connection: this.toConnectionView(row) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to disconnect provider';
      const [row] = await this.databaseService.db
        .update(messagingConnections)
        .set({
          status: 'error',
          lastError: message,
          lastStatusAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(messagingConnections.id, connection.id), eq(messagingConnections.tenantId, user.tenantId)))
        .returning();

      return { connection: this.toConnectionView(row) };
    }
  }

  async deleteConnection(user: AuthenticatedUser, connectionId: string): Promise<{ ok: true }> {
    await this.findTenantConnection(user.tenantId, connectionId);

    await this.databaseService.db
      .delete(messagingConnections)
      .where(and(eq(messagingConnections.id, connectionId), eq(messagingConnections.tenantId, user.tenantId)));

    return { ok: true };
  }

  async listConversations(user: AuthenticatedUser): Promise<{ conversations: MessagingConversationView[] }> {
    const rows = await this.databaseService.db
      .select()
      .from(messagingConversations)
      .where(eq(messagingConversations.tenantId, user.tenantId))
      .orderBy(desc(messagingConversations.lastMessageAt), desc(messagingConversations.createdAt))
      .limit(80);

    return {
      conversations: rows.map((row) => this.toConversationView(row)),
    };
  }

  async listMessages(
    user: AuthenticatedUser,
    conversationId: string,
  ): Promise<{ messages: MessagingMessageView[]; conversation: MessagingConversationView }> {
    const conversation = await this.findTenantConversation(user.tenantId, conversationId);
    const rows = await this.databaseService.db
      .select()
      .from(messagingMessages)
      .where(and(eq(messagingMessages.tenantId, user.tenantId), eq(messagingMessages.conversationId, conversationId)))
      .orderBy(asc(messagingMessages.createdAt))
      .limit(200);

    return {
      conversation: this.toConversationView(conversation),
      messages: rows.map((row) => this.toMessageView(row)),
    };
  }

  async sendConversationText(
    user: AuthenticatedUser,
    input: SendConversationTextInput,
  ): Promise<{ message: MessagingMessageView }> {
    const text = input.message.trim();

    if (!text) {
      throw new BadRequestException('message is required');
    }

    const conversation = await this.findTenantConversation(user.tenantId, input.conversationId);
    const connection = await this.findTenantConnection(user.tenantId, conversation.connectionId);
    const provider = this.getProvider(connection);
    const number = conversation.isGroup ? conversation.waJid : onlyDigits(conversation.waJid);
    const payload: ProviderSendTextPayload = {
      number,
      text,
      ...(conversation.isGroup ? { remoteJid: conversation.waJid } : {}),
      ...(input.replyToMessageId ? { messageId: input.replyToMessageId, quoted: { id: input.replyToMessageId } } : {}),
    };
    const credentials = this.readZApiCredentials(connection);
    const result = await provider.sendText(credentials, payload);
    const externalMessageId =
      result.externalMessageId ?? `local_out_${connection.tenantId}_${conversation.id}_${Date.now()}_${hashText(text)}`;
    const now = new Date();

    const [message] = await this.databaseService.db
      .insert(messagingMessages)
      .values({
        tenantId: conversation.tenantId,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        connectionId: connection.id,
        provider: connection.provider,
        externalMessageId,
        direction: 'out',
        messageType: 'text',
        status: 'sent',
        senderJid: connection.connectedPhone,
        body: text,
        replyToExternalMessageId: input.replyToMessageId ?? null,
        rawPayload: {
          request: payload,
          response: result.response,
          http_code: result.httpCode ?? null,
        },
        sentAt: now,
      })
      .onConflictDoUpdate({
        target: [messagingMessages.connectionId, messagingMessages.externalMessageId],
        set: {
          status: 'sent',
          rawPayload: {
            request: payload,
            response: result.response,
            http_code: result.httpCode ?? null,
          },
          updatedAt: now,
        },
      })
      .returning();

    await this.touchConversation(conversation.id, text, now, false);

    return { message: this.toMessageView(message) };
  }

  async handleWhatsappWebhook(body: unknown, providerHint?: MessagingProvider): Promise<{ ok: true }> {
    if (!isRecord(body) || Object.keys(body).length === 0) {
      throw new BadRequestException('Webhook payload is required');
    }

    const provider = providerHint ?? (typeof body.instanceId === 'string' ? 'zapi' : 'evolution');

    if (provider !== 'zapi') {
      throw new BadRequestException('Evolution webhook support is not configured yet');
    }

    const normalized = this.normalizeZApiWebhook(body);
    const connection = await this.findConnectionByProviderInstance(provider, normalized.instance);

    const [event] = await this.databaseService.db
      .insert(messagingWebhookEvents)
      .values({
        tenantId: connection?.tenantId ?? null,
        organizationId: connection?.organizationId ?? null,
        connectionId: connection?.id ?? null,
        provider,
        externalInstanceId: normalized.instance,
        eventType: normalized.event,
        payload: body,
        normalizedPayload: toJsonRecord(normalized),
        processingStatus: connection ? 'processing' : 'ignored',
        processingError: connection ? null : 'Connection not found for webhook instance',
      })
      .returning();

    if (!connection) {
      return { ok: true };
    }

    try {
      await this.processNormalizedWebhook(connection, normalized);
      await this.databaseService.db
        .update(messagingWebhookEvents)
        .set({ processingStatus: 'processed', processingError: null })
        .where(eq(messagingWebhookEvents.id, event.id));
    } catch (error) {
      await this.databaseService.db
        .update(messagingWebhookEvents)
        .set({
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Webhook processing failed',
        })
        .where(eq(messagingWebhookEvents.id, event.id));

      throw error;
    }

    return { ok: true };
  }

  async handleZApiConnectionWebhook(body: unknown, connectionId?: string): Promise<{ ok: true }> {
    if (!connectionId) {
      return this.handleWhatsappWebhook(body, 'zapi');
    }

    if (!isRecord(body)) {
      throw new BadRequestException('Webhook payload is required');
    }

    const instanceId = typeof body.instanceId === 'string' ? body.instanceId : null;

    if (!instanceId) {
      throw new BadRequestException('instanceId is required');
    }

    const connection = await this.findConnectionByProviderInstance('zapi', instanceId, connectionId);

    if (!connection) {
      return { ok: true };
    }

    return this.handleWhatsappWebhook(body, 'zapi');
  }

  private async processNormalizedWebhook(connection: MessagingConnectionRow, normalized: NormalizedWebhook): Promise<void> {
    if (normalized.event === 'connection.update') {
      const status = readString(normalized.data, 'status') === 'connected' ? 'connected' : 'disconnected';

      await this.databaseService.db
        .update(messagingConnections)
        .set({
          status,
          connectedPhone: readString(normalized.data, 'number') ?? connection.connectedPhone,
          lastError: readString(normalized.data, 'reason'),
          lastStatusAt: new Date(normalized.timestamp * 1000),
          updatedAt: new Date(),
        })
        .where(eq(messagingConnections.id, connection.id));
      return;
    }

    if (normalized.event === 'messages.update') {
      const externalMessageId = readString(normalized.data, 'id');
      const status = normalizeMessageStatus(readString(normalized.data, 'status'), readBoolean(normalized.data, 'fromMe'));

      if (!externalMessageId) {
        return;
      }

      await this.databaseService.db
        .update(messagingMessages)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(messagingMessages.connectionId, connection.id), eq(messagingMessages.externalMessageId, externalMessageId)));
      return;
    }

    await this.upsertIncomingMessage(connection, normalized);
  }

  private async upsertIncomingMessage(connection: MessagingConnectionRow, normalized: NormalizedWebhook): Promise<void> {
    const data = normalized.data;
    const remoteJid = readString(data, 'remoteJid');
    const externalMessageId = readString(data, 'id');

    if (!remoteJid || !externalMessageId) {
      return;
    }

    const fromMe = readBoolean(data, 'fromMe');
    const status = normalizeMessageStatus(readString(data, 'status'), fromMe);
    const timestamp = new Date(normalized.timestamp * 1000);
    const message = readRecord(data, 'message');
    const media = readRecord(data, 'media') ?? {};
    const body = readString(message, 'conversation') ?? readString(media, 'caption') ?? '';
    const messageType = inferMessageType(media);
    const conversation = await this.upsertConversation(connection, {
      remoteJid,
      displayName: readString(data, 'pushName'),
      isGroup: remoteJid.endsWith('@g.us'),
      preview: body || `[${messageType}]`,
      timestamp,
      inbound: !fromMe,
    });
    const now = new Date();

    await this.databaseService.db
      .insert(messagingMessages)
      .values({
        tenantId: connection.tenantId,
        organizationId: connection.organizationId,
        conversationId: conversation.id,
        connectionId: connection.id,
        provider: connection.provider,
        externalMessageId,
        direction: fromMe ? 'out' : 'in',
        messageType,
        status,
        senderJid: readString(data, 'participant') ?? remoteJid,
        senderName: readString(data, 'pushName'),
        body,
        replyToExternalMessageId: readString(data, 'replyToMessageId'),
        media,
        rawPayload: toJsonRecord(normalized),
        sentAt: fromMe ? timestamp : null,
        receivedAt: fromMe ? null : timestamp,
      })
      .onConflictDoUpdate({
        target: [messagingMessages.connectionId, messagingMessages.externalMessageId],
        set: {
          status,
          body,
          media,
          rawPayload: toJsonRecord(normalized),
          updatedAt: now,
        },
      });
  }

  private async upsertConversation(
    connection: MessagingConnectionRow,
    input: {
      remoteJid: string;
      displayName: string | null;
      isGroup: boolean;
      preview: string;
      timestamp: Date;
      inbound: boolean;
    },
  ): Promise<MessagingConversationRow> {
    const [existing] = await this.databaseService.db
      .select()
      .from(messagingConversations)
      .where(
        and(
          eq(messagingConversations.tenantId, connection.tenantId),
          eq(messagingConversations.connectionId, connection.id),
          eq(messagingConversations.waJid, input.remoteJid),
        ),
      )
      .limit(1);

    if (existing) {
      const [row] = await this.databaseService.db
        .update(messagingConversations)
        .set({
          displayName: input.displayName ?? existing.displayName,
          isGroup: input.isGroup,
          lastMessagePreview: input.preview,
          lastMessageAt: input.timestamp,
          lastInboundAt: input.inbound ? input.timestamp : existing.lastInboundAt,
          unreadCount: input.inbound ? sql`${messagingConversations.unreadCount} + 1` : existing.unreadCount,
          updatedAt: new Date(),
        })
        .where(eq(messagingConversations.id, existing.id))
        .returning();

      return row;
    }

    const [row] = await this.databaseService.db
      .insert(messagingConversations)
      .values({
        tenantId: connection.tenantId,
        organizationId: connection.organizationId,
        connectionId: connection.id,
        provider: connection.provider,
        waJid: input.remoteJid,
        phone: input.isGroup ? null : onlyDigits(input.remoteJid),
        displayName: input.displayName,
        isGroup: input.isGroup,
        lastMessagePreview: input.preview,
        lastMessageAt: input.timestamp,
        lastInboundAt: input.inbound ? input.timestamp : null,
        unreadCount: input.inbound ? 1 : 0,
      })
      .returning();

    return row;
  }

  private normalizeZApiWebhook(payload: Record<string, unknown>): NormalizedWebhook {
    const instance = readString(payload, 'instanceId');

    if (!instance) {
      throw new BadRequestException('instanceId is required');
    }

    const type = (readString(payload, 'type') ?? '').toLowerCase();
    const timestamp = normalizeTimestamp(readNumber(payload, 'moment') ?? readNumber(payload, 'momment') ?? Date.now());

    if (type.includes('connected')) {
      return {
        _provider: 'zapi',
        event: 'connection.update',
        instance,
        timestamp,
        data: {
          state: 'open',
          status: 'connected',
          number: readString(payload, 'phone'),
        },
      };
    }

    if (type.includes('disconnected')) {
      return {
        _provider: 'zapi',
        event: 'connection.update',
        instance,
        timestamp,
        data: {
          state: 'close',
          status: 'disconnected',
          reason: readString(payload, 'error') ?? 'disconnected',
        },
      };
    }

    const fromMe = readBoolean(payload, 'fromMe');
    const status = normalizeMessageStatus(readString(payload, 'status') ?? type, fromMe);
    const hasMessageContent = Boolean(readMessageText(payload) || extractMedia(payload));
    const event = !hasMessageContent && Boolean(readString(payload, 'status')) ? 'messages.update' : 'messages.upsert';
    const remoteJid = normalizeJid(payload);
    const media = extractMedia(payload);

    return {
      _provider: 'zapi',
      event,
      instance,
      timestamp,
      data: {
        _provider: 'zapi',
        instance,
        remoteJid,
        participant: normalizeParticipantJid(payload),
        id: readString(payload, 'messageId') ?? readString(payload, 'id'),
        fromMe,
        pushName: readString(payload, 'senderName') ?? readString(payload, 'chatName'),
        status,
        messageTimestamp: timestamp,
        replyToMessageId:
          readString(payload, 'referenceMessageId') ??
          readString(payload, 'quotedMessageId') ??
          readString(payload, 'quotedMsgId') ??
          readString(payload, 'messageReferenceId'),
        media: media ?? {},
        message: {
          conversation: readMessageText(payload),
        },
      },
    };
  }

  private getProvider(connection: MessagingConnectionRow): ZApiProvider {
    if (connection.provider !== 'zapi') {
      throw new BadRequestException(`Provider ${connection.provider} is not configured in this deployment`);
    }

    return this.zApiProvider;
  }

  private async findPrimaryWhatsappConnection(tenantId: string): Promise<MessagingConnectionRow | null> {
    const [row] = await this.databaseService.db
      .select()
      .from(messagingConnections)
      .where(and(eq(messagingConnections.tenantId, tenantId), eq(messagingConnections.channel, 'whatsapp')))
      .limit(1);

    return row ?? null;
  }

  private async findTenantConnection(tenantId: string, connectionId: string): Promise<MessagingConnectionRow> {
    const [row] = await this.databaseService.db
      .select()
      .from(messagingConnections)
      .where(and(eq(messagingConnections.id, connectionId), eq(messagingConnections.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Messaging connection not found');
    }

    return row;
  }

  private async findTenantConversation(tenantId: string, conversationId: string): Promise<MessagingConversationRow> {
    const [row] = await this.databaseService.db
      .select()
      .from(messagingConversations)
      .where(and(eq(messagingConversations.id, conversationId), eq(messagingConversations.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Conversation not found');
    }

    return row;
  }

  private async findConnectionByProviderInstance(
    provider: MessagingProvider,
    instanceId: string,
    connectionId?: string,
  ): Promise<MessagingConnectionRow | null> {
    const whereClause =
      connectionId ?
        and(
          eq(messagingConnections.id, connectionId),
          eq(messagingConnections.provider, provider),
          eq(messagingConnections.externalInstanceId, instanceId),
        )
      : and(eq(messagingConnections.provider, provider), eq(messagingConnections.externalInstanceId, instanceId));
    const [row] = await this.databaseService.db.select().from(messagingConnections).where(whereClause).limit(1);

    return row ?? null;
  }

  private async touchConversation(
    conversationId: string,
    preview: string,
    timestamp: Date,
    inbound: boolean,
  ): Promise<void> {
    await this.databaseService.db
      .update(messagingConversations)
      .set({
        lastMessagePreview: preview,
        lastMessageAt: timestamp,
        lastInboundAt: inbound ? timestamp : undefined,
        updatedAt: new Date(),
      })
      .where(eq(messagingConversations.id, conversationId));
  }

  private normalizeZApiCredentials(
    input: SaveZApiConnectionInput,
    currentCredentials?: Record<string, unknown>,
  ): StoredZApiCredentials {
    const parsed = parseFlexibleZApiCredentials(input, currentCredentials);
    const name = input.name.trim();

    if (!name || !parsed.instanceId || !parsed.token) {
      throw new BadRequestException('name, instanceId and token are required');
    }

    return {
      instanceId: parsed.instanceId,
      token: parsed.token,
      ...(parsed.clientToken ? { clientToken: parsed.clientToken } : {}),
    };
  }

  private readZApiCredentials(connection: MessagingConnectionRow): ZApiCredentials {
    if (connection.provider !== 'zapi') {
      throw new BadRequestException('Only Z-API credentials are configured in this deployment');
    }

    const instanceId = readString(connection.credentials, 'instanceId');
    const token = readString(connection.credentials, 'token');
    const clientToken = readString(connection.credentials, 'clientToken');

    if (!instanceId || !token) {
      throw new BadRequestException('Z-API credentials are not configured');
    }

    return {
      instanceId,
      token,
      ...(clientToken ? { clientToken } : {}),
    };
  }

  private toConnectionView(row: MessagingConnectionRow): MessagingConnectionView {
    return {
      id: row.id,
      name: row.name,
      channel: row.channel,
      provider: row.provider,
      status: row.status,
      externalInstanceId: row.externalInstanceId,
      connectedPhone: row.connectedPhone,
      credentialsConfigured: Boolean(row.credentials.instanceId) && Boolean(row.credentials.token),
      lastError: row.lastError,
      lastStatusAt: row.lastStatusAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toConversationView(row: MessagingConversationRow): MessagingConversationView {
    return {
      id: row.id,
      connectionId: row.connectionId,
      provider: row.provider,
      waJid: row.waJid,
      phone: row.phone,
      displayName: row.displayName,
      isGroup: row.isGroup,
      mode: row.mode,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      lastInboundAt: row.lastInboundAt,
      unreadCount: row.unreadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toMessageView(row: MessagingMessageRow): MessagingMessageView {
    return {
      id: row.id,
      conversationId: row.conversationId,
      connectionId: row.connectionId,
      provider: row.provider,
      externalMessageId: row.externalMessageId,
      direction: row.direction,
      messageType: row.messageType,
      status: row.status,
      senderJid: row.senderJid,
      senderName: row.senderName,
      body: row.body,
      replyToExternalMessageId: row.replyToExternalMessageId,
      media: row.media,
      sentAt: row.sentAt,
      receivedAt: row.receivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

function parseFlexibleZApiCredentials(
  input: SaveZApiConnectionInput,
  currentCredentials?: Record<string, unknown>,
): StoredZApiCredentials {
  const direct = {
    instanceId: input.instanceId?.trim() || readString(currentCredentials, 'instanceId') || '',
    token: input.token?.trim() || readString(currentCredentials, 'token') || '',
    clientToken:
      input.clientToken === undefined ? readString(currentCredentials, 'clientToken') || '' : input.clientToken.trim(),
  };

  if (direct.token.includes('/instances/')) {
    return { ...direct, ...parseZApiUrl(direct.token) };
  }

  const json = parseJsonObject(direct.token);

  if (json) {
    return {
      instanceId: readString(json, 'instance_id') ?? readString(json, 'instanceId') ?? direct.instanceId,
      token:
        readString(json, 'token') ??
        readString(json, 'instance_token') ??
        readString(json, 'instanceToken') ??
        direct.token,
      clientToken: readString(json, 'client_token') ?? readString(json, 'clientToken') ?? direct.clientToken,
    };
  }

  if (direct.token.includes('|')) {
    const [token, clientToken] = direct.token.split('|').map((part) => part.trim());

    return {
      instanceId: direct.instanceId,
      token,
      clientToken: clientToken || direct.clientToken,
    };
  }

  return direct;
}

function parseZApiUrl(value: string): Partial<StoredZApiCredentials> {
  const match = value.match(/\/instances\/([^/]+)\/token\/([^/?#]+)/);

  if (!match) {
    return {};
  }

  return {
    instanceId: decodeURIComponent(match[1]),
    token: decodeURIComponent(match[2]),
  };
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readMessageText(payload: Record<string, unknown>): string | null {
  const text = readRecord(payload, 'text');

  return readString(text, 'message') ?? readString(payload, 'message') ?? readString(payload, 'body');
}

function extractMedia(payload: Record<string, unknown>): Record<string, unknown> | null {
  for (const type of ['image', 'audio', 'video', 'document'] as const) {
    const direct = readRecord(payload, type);
    const source = direct ?? payload;
    const url =
      readString(source, `${type}Url`) ??
      readString(source, `${type}_url`) ??
      readString(source, 'url') ??
      readString(source, 'mediaUrl') ??
      readString(source, 'downloadUrl');
    const base64 = readString(source, 'base64');

    if (!direct && !url && !base64) {
      continue;
    }

    return {
      type,
      ...(url ? { url } : {}),
      ...(base64 ? { base64 } : {}),
      mimeType: readString(source, 'mimeType') ?? readString(source, 'mimetype') ?? readString(source, 'mime_type'),
      caption: readString(source, 'caption') ?? readString(source, 'message'),
      fileName: readString(source, 'fileName') ?? readString(source, 'filename') ?? readString(source, 'title'),
    };
  }

  return null;
}

function inferMessageType(media: Record<string, unknown>): MessagingMessageType {
  const type = readString(media, 'type');

  return type === 'image' || type === 'audio' || type === 'video' || type === 'document' ? type : 'text';
}

function normalizeJid(payload: Record<string, unknown>): string | null {
  const isGroup = readBoolean(payload, 'isGroup');
  const phone = readString(payload, 'chatLid') ?? readString(payload, 'phone');

  if (!phone) {
    return null;
  }

  if (phone.endsWith('@g.us') || phone.endsWith('@s.whatsapp.net')) {
    return phone;
  }

  if (isGroup || phone.endsWith('-group')) {
    return `${phone.replace(/-group$/, '')}@g.us`;
  }

  return `${onlyDigits(phone)}@s.whatsapp.net`;
}

function normalizeParticipantJid(payload: Record<string, unknown>): string | null {
  const phone = readString(payload, 'participantPhone');

  if (!phone) {
    return null;
  }

  if (phone.endsWith('@s.whatsapp.net')) {
    return phone;
  }

  return `${onlyDigits(phone)}@s.whatsapp.net`;
}

function normalizeMessageStatus(status: string | null, fromMe: boolean): MessagingMessageStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'read':
    case 'played':
      return 'read';
    case 'delivered':
      return 'delivered';
    case 'received':
      return fromMe ? 'sent' : 'received';
    case 'sent':
    case 'pending':
      return 'sent';
    case 'error':
    case 'failed':
      return 'failed';
    default:
      return fromMe ? 'sent' : 'received';
  }
}

function normalizeTimestamp(value: number): number {
  return value > 9999999999 ? Math.floor(value / 1000) : value;
}

function readRecord(value: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
  const field = value?.[key];

  return isRecord(field) ? field : null;
}

function readString(value: Record<string, unknown> | null | undefined, key: string): string | null {
  const field = value?.[key];

  return typeof field === 'string' && field.trim() ? field.trim() : null;
}

function readBoolean(value: Record<string, unknown> | null | undefined, key: string): boolean {
  return value?.[key] === true;
}

function readNumber(value: Record<string, unknown> | null | undefined, key: string): number | null {
  const field = value?.[key];

  if (typeof field === 'number' && Number.isFinite(field)) {
    return field;
  }

  if (typeof field === 'string' && field.trim() && Number.isFinite(Number(field))) {
    return Number(field);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toJsonRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function hashText(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}
