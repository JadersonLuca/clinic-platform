CREATE TYPE "public"."messaging_channel" AS ENUM('whatsapp');--> statement-breakpoint
CREATE TYPE "public"."messaging_provider" AS ENUM('zapi');--> statement-breakpoint
CREATE TYPE "public"."messaging_connection_status" AS ENUM('not_configured', 'disconnected', 'qr_pending', 'connected', 'error');--> statement-breakpoint
CREATE TABLE "messaging_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"channel" "messaging_channel" NOT NULL,
	"provider" "messaging_provider" NOT NULL,
	"status" "messaging_connection_status" DEFAULT 'not_configured' NOT NULL,
	"external_instance_id" text,
	"connected_phone" text,
	"credentials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"last_status_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messaging_connections" ADD CONSTRAINT "messaging_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_connections" ADD CONSTRAINT "messaging_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messaging_connections_tenant_id_idx" ON "messaging_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_connections_tenant_channel_idx" ON "messaging_connections" USING btree ("tenant_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_connections_provider_instance_unique" ON "messaging_connections" USING btree ("provider","external_instance_id") WHERE external_instance_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_connections_tenant_provider_instance_unique" ON "messaging_connections" USING btree ("tenant_id","provider","external_instance_id") WHERE external_instance_id is not null;
