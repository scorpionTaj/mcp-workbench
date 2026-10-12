ALTER TABLE "AgentSchedule" ADD COLUMN "notifyWebhook" text;--> statement-breakpoint
ALTER TABLE "AgentSchedule" ADD COLUMN "notifyOn" text DEFAULT 'error' NOT NULL;