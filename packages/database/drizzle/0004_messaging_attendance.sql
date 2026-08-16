ALTER TYPE "public"."messaging_provider" ADD VALUE IF NOT EXISTS 'evolution';--> statement-breakpoint
CREATE TYPE "public"."messaging_conversation_mode" AS ENUM('ai', 'human', 'paused');--> statement-breakpoint
CREATE TYPE "public"."messaging_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."messaging_message_type" AS ENUM('text', 'image', 'audio', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."messaging_message_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'received', 'failed');--> statement-breakpoint
CREATE TABLE "messaging_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid,
	"connection_id" uuid NOT NULL,
	"provider" "messaging_provider" NOT NULL,
	"wa_jid" text NOT NULL,
	"phone" text,
	"display_name" text,
	"is_group" boolean DEFAULT false NOT NULL,
	"mode" "messaging_conversation_mode" DEFAULT 'ai' NOT NULL,
	"assigned_user_id" uuid,
	"last_message_preview" text,
	"last_message_at" timestamp with time zone,
	"last_inbound_at" timestamp with time zone,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid,
	"conversation_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" "messaging_provider" NOT NULL,
	"external_message_id" text NOT NULL,
	"direction" "messaging_direction" NOT NULL,
	"message_type" "messaging_message_type" DEFAULT 'text' NOT NULL,
	"status" "messaging_message_status" DEFAULT 'pending' NOT NULL,
	"sender_jid" text,
	"sender_name" text,
	"body" text,
	"reply_to_external_message_id" text,
	"media" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"organization_id" uuid,
	"connection_id" uuid,
	"provider" "messaging_provider" NOT NULL,
	"external_instance_id" text,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"normalized_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processing_status" text DEFAULT 'processed' NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_connection_id_messaging_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."messaging_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_conversation_id_messaging_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."messaging_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_connection_id_messaging_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."messaging_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_webhook_events" ADD CONSTRAINT "messaging_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_webhook_events" ADD CONSTRAINT "messaging_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_webhook_events" ADD CONSTRAINT "messaging_webhook_events_connection_id_messaging_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."messaging_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messaging_conversations_tenant_id_idx" ON "messaging_conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_conversations_connection_id_idx" ON "messaging_conversations" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "messaging_conversations_tenant_last_message_idx" ON "messaging_conversations" USING btree ("tenant_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_conversations_tenant_connection_jid_unique" ON "messaging_conversations" USING btree ("tenant_id","connection_id","wa_jid");--> statement-breakpoint
CREATE INDEX "messaging_messages_tenant_id_idx" ON "messaging_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_messages_conversation_id_idx" ON "messaging_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_messages_connection_external_unique" ON "messaging_messages" USING btree ("connection_id","external_message_id");--> statement-breakpoint
CREATE INDEX "messaging_webhook_events_tenant_id_idx" ON "messaging_webhook_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_webhook_events_connection_id_idx" ON "messaging_webhook_events" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "messaging_webhook_events_provider_instance_idx" ON "messaging_webhook_events" USING btree ("provider","external_instance_id");
