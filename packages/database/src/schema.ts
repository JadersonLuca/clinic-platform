import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
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
export const messagingProviderEnum = pgEnum('messaging_provider', ['zapi']);
export const messagingConnectionStatusEnum = pgEnum('messaging_connection_status', [
  'not_configured',
  'disconnected',
  'qr_pending',
  'connected',
  'error',
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
