import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'suspended']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'invited']);
export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'superadmin', 'admin', 'staff']);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'inactive', 'invited']);
export const organizationTypeEnum = pgEnum('organization_type', [
  'practice',
  'solo_practitioner',
  'company',
  'other',
]);
export const messagingChannelEnum = pgEnum('messaging_channel', ['whatsapp']);
export const messagingProviderEnum = pgEnum('messaging_provider', ['zapi', 'evolution']);
export const messagingConnectionStatusEnum = pgEnum('messaging_connection_status', [
  'not_configured',
  'disconnected',
  'qr_pending',
  'connected',
  'error',
]);
export const messagingConversationModeEnum = pgEnum('messaging_conversation_mode', ['ai', 'human', 'paused']);
export const messagingDirectionEnum = pgEnum('messaging_direction', ['in', 'out']);
export const messagingMessageTypeEnum = pgEnum('messaging_message_type', ['text', 'image', 'audio', 'video', 'document']);
export const messagingMessageStatusEnum = pgEnum('messaging_message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'received',
  'failed',
]);

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: tenantStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('tenants_slug_unique').on(table.slug),
    statusIndex: index('tenants_status_idx').on(table.status),
  }),
);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    legalName: text('legal_name'),
    documentNumber: text('document_number'),
    type: organizationTypeEnum('type').notNull().default('practice'),
    isPrimary: boolean('is_primary').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIndex: index('organizations_tenant_id_idx').on(table.tenantId),
    tenantDocumentUnique: uniqueIndex('organizations_tenant_document_unique')
      .on(table.tenantId, table.documentNumber)
      .where(sql`document_number is not null`),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailNormalized: text('email_normalized').notNull(),
    passwordHash: text('password_hash').notNull(),
    status: userStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailNormalizedUnique: uniqueIndex('users_email_normalized_unique').on(table.emailNormalized),
    statusIndex: index('users_status_idx').on(table.status),
  }),
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull().default('staff'),
    status: membershipStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIndex: index('memberships_tenant_id_idx').on(table.tenantId),
    userIndex: index('memberships_user_id_idx').on(table.userId),
    organizationIndex: index('memberships_organization_id_idx').on(table.organizationId),
    tenantUserUnique: uniqueIndex('memberships_tenant_user_unique')
      .on(table.tenantId, table.userId)
      .where(sql`organization_id is null`),
    tenantOrganizationUserUnique: uniqueIndex('memberships_tenant_organization_user_unique')
      .on(table.tenantId, table.organizationId, table.userId)
      .where(sql`organization_id is not null`),
  }),
);

export const messagingConnections = pgTable(
  'messaging_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    channel: messagingChannelEnum('channel').notNull(),
    provider: messagingProviderEnum('provider').notNull(),
    status: messagingConnectionStatusEnum('status').notNull().default('not_configured'),
    externalInstanceId: text('external_instance_id'),
    connectedPhone: text('connected_phone'),
    credentials: jsonb('credentials').$type<Record<string, unknown>>().notNull().default({}),
    providerSettings: jsonb('provider_settings').$type<Record<string, unknown>>().notNull().default({}),
    lastError: text('last_error'),
    lastStatusAt: timestamp('last_status_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIndex: index('messaging_connections_tenant_id_idx').on(table.tenantId),
    tenantChannelIndex: index('messaging_connections_tenant_channel_idx').on(table.tenantId, table.channel),
    providerInstanceUnique: uniqueIndex('messaging_connections_provider_instance_unique')
      .on(table.provider, table.externalInstanceId)
      .where(sql`external_instance_id is not null`),
    tenantProviderInstanceUnique: uniqueIndex('messaging_connections_tenant_provider_instance_unique')
      .on(table.tenantId, table.provider, table.externalInstanceId)
      .where(sql`external_instance_id is not null`),
  }),
);

export const messagingConversations = pgTable(
  'messaging_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => messagingConnections.id, { onDelete: 'cascade' }),
    provider: messagingProviderEnum('provider').notNull(),
    waJid: text('wa_jid').notNull(),
    phone: text('phone'),
    displayName: text('display_name'),
    isGroup: boolean('is_group').notNull().default(false),
    mode: messagingConversationModeEnum('mode').notNull().default('ai'),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastMessagePreview: text('last_message_preview'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    unreadCount: integer('unread_count').notNull().default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIndex: index('messaging_conversations_tenant_id_idx').on(table.tenantId),
    connectionIndex: index('messaging_conversations_connection_id_idx').on(table.connectionId),
    tenantLastMessageIndex: index('messaging_conversations_tenant_last_message_idx').on(table.tenantId, table.lastMessageAt),
    tenantConnectionJidUnique: uniqueIndex('messaging_conversations_tenant_connection_jid_unique').on(
      table.tenantId,
      table.connectionId,
      table.waJid,
    ),
  }),
);

export const messagingMessages = pgTable(
  'messaging_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => messagingConversations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => messagingConnections.id, { onDelete: 'cascade' }),
    provider: messagingProviderEnum('provider').notNull(),
    externalMessageId: text('external_message_id').notNull(),
    direction: messagingDirectionEnum('direction').notNull(),
    messageType: messagingMessageTypeEnum('message_type').notNull().default('text'),
    status: messagingMessageStatusEnum('status').notNull().default('pending'),
    senderJid: text('sender_jid'),
    senderName: text('sender_name'),
    body: text('body'),
    replyToExternalMessageId: text('reply_to_external_message_id'),
    media: jsonb('media').$type<Record<string, unknown>>().notNull().default({}),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull().default({}),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIndex: index('messaging_messages_tenant_id_idx').on(table.tenantId),
    conversationIndex: index('messaging_messages_conversation_id_idx').on(table.conversationId),
    connectionExternalUnique: uniqueIndex('messaging_messages_connection_external_unique').on(
      table.connectionId,
      table.externalMessageId,
    ),
  }),
);

export const messagingWebhookEvents = pgTable(
  'messaging_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    connectionId: uuid('connection_id').references(() => messagingConnections.id, { onDelete: 'set null' }),
    provider: messagingProviderEnum('provider').notNull(),
    externalInstanceId: text('external_instance_id'),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    normalizedPayload: jsonb('normalized_payload').$type<Record<string, unknown>>().notNull().default({}),
    processingStatus: text('processing_status').notNull().default('processed'),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIndex: index('messaging_webhook_events_tenant_id_idx').on(table.tenantId),
    connectionIndex: index('messaging_webhook_events_connection_id_idx').on(table.connectionId),
    providerInstanceIndex: index('messaging_webhook_events_provider_instance_idx').on(table.provider, table.externalInstanceId),
  }),
);
