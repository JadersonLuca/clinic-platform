import { messagingConnections } from '@clinic/database';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ZApiProvider } from './providers/zapi.provider';
import type {
  MessagingConnectionStatus,
  MessagingConnectionView,
  SaveZApiConnectionInput,
  ZApiCredentials,
} from './messaging.types';

type StoredZApiCredentials = ZApiCredentials & Record<string, string>;

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
      connections: rows.map((row) => this.toView(row)),
    };
  }

  async getPrimaryWhatsappConnection(user: AuthenticatedUser): Promise<{ connection: MessagingConnectionView | null }> {
    const row = await this.findPrimaryWhatsappConnection(user.tenantId);

    return {
      connection: row ? this.toView(row) : null,
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

      return { connection: this.toView(row) };
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

    return { connection: this.toView(row) };
  }

  async refreshStatus(user: AuthenticatedUser, connectionId: string): Promise<{ connection: MessagingConnectionView }> {
    const connection = await this.findTenantConnection(user.tenantId, connectionId);
    const credentials = this.readZApiCredentials(connection.credentials);

    try {
      const status = await this.zApiProvider.getStatus(credentials);

      const [row] = await this.databaseService.db
        .update(messagingConnections)
        .set({
          status: status.status,
          connectedPhone: status.connectedPhone ?? connection.connectedPhone,
          lastError: status.error ?? null,
          lastStatusAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(messagingConnections.id, connection.id), eq(messagingConnections.tenantId, user.tenantId)))
        .returning();

      return { connection: this.toView(row) };
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

      return { connection: this.toView(row) };
    }
  }

  async getQrCode(user: AuthenticatedUser, connectionId: string): Promise<{ qrCode: string }> {
    const connection = await this.findTenantConnection(user.tenantId, connectionId);
    const credentials = this.readZApiCredentials(connection.credentials);
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

  async handleZApiConnectionWebhook(body: unknown, connectionId?: string): Promise<{ ok: true }> {
    if (!isRecord(body)) {
      return { ok: true };
    }

    const instanceId = typeof body.instanceId === 'string' ? body.instanceId : null;

    if (!instanceId) {
      return { ok: true };
    }

    const connected = body.connected === true;
    const phone = typeof body.phone === 'string' ? body.phone : null;
    const status: MessagingConnectionStatus = connected ? 'connected' : 'disconnected';

    const whereClause =
      connectionId ?
        and(
          eq(messagingConnections.id, connectionId),
          eq(messagingConnections.provider, 'zapi'),
          eq(messagingConnections.externalInstanceId, instanceId),
        )
      : and(eq(messagingConnections.provider, 'zapi'), eq(messagingConnections.externalInstanceId, instanceId));

    await this.databaseService.db
      .update(messagingConnections)
      .set({
        status,
        connectedPhone: phone,
        lastError: null,
        lastStatusAt: new Date(),
        updatedAt: new Date(),
      })
      .where(whereClause);

    return { ok: true };
  }

  private async findPrimaryWhatsappConnection(tenantId: string) {
    const [row] = await this.databaseService.db
      .select()
      .from(messagingConnections)
      .where(and(eq(messagingConnections.tenantId, tenantId), eq(messagingConnections.channel, 'whatsapp')))
      .limit(1);

    return row ?? null;
  }

  private async findTenantConnection(tenantId: string, connectionId: string) {
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

  private normalizeZApiCredentials(
    input: SaveZApiConnectionInput,
    currentCredentials?: Record<string, unknown>,
  ): StoredZApiCredentials {
    const name = input.name.trim();
    const instanceId = input.instanceId.trim();
    const token = input.token?.trim() || readString(currentCredentials, 'token') || '';
    const clientToken = input.clientToken?.trim() || readString(currentCredentials, 'clientToken') || '';

    if (!name || !instanceId || !token || !clientToken) {
      throw new BadRequestException('name, instanceId, token and clientToken are required');
    }

    return {
      instanceId,
      token,
      clientToken,
    };
  }

  private readZApiCredentials(credentials: Record<string, unknown>): ZApiCredentials {
    const instanceId = readString(credentials, 'instanceId');
    const token = readString(credentials, 'token');
    const clientToken = readString(credentials, 'clientToken');

    if (!instanceId || !token || !clientToken) {
      throw new BadRequestException('Z-API credentials are not configured');
    }

    return {
      instanceId,
      token,
      clientToken,
    };
  }

  private toView(row: typeof messagingConnections.$inferSelect): MessagingConnectionView {
    return {
      id: row.id,
      name: row.name,
      channel: row.channel,
      provider: row.provider,
      status: row.status,
      externalInstanceId: row.externalInstanceId,
      connectedPhone: row.connectedPhone,
      credentialsConfigured:
        Boolean(row.credentials.instanceId) && Boolean(row.credentials.token) && Boolean(row.credentials.clientToken),
      lastError: row.lastError,
      lastStatusAt: row.lastStatusAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

function readString(value: Record<string, unknown> | undefined, key: string): string | null {
  const field = value?.[key];

  return typeof field === 'string' ? field : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
