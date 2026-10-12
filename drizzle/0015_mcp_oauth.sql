ALTER TABLE "McpServer" ADD COLUMN "authType" text DEFAULT 'headers' NOT NULL;--> statement-breakpoint
ALTER TABLE "McpServer" ADD COLUMN "oauth" text;