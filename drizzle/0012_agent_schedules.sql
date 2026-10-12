CREATE TABLE "AgentSchedule" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"agentId" text NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"cron" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"provider" text,
	"modelId" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"nextRunAt" timestamp,
	"lastRunAt" timestamp,
	"lastStatus" text,
	"lastError" text,
	"lastChatId" text,
	"runCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AgentSchedule" ADD CONSTRAINT "AgentSchedule_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AgentSchedule" ADD CONSTRAINT "AgentSchedule_agentId_Agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "AgentSchedule_userId_idx" ON "AgentSchedule" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AgentSchedule_due_idx" ON "AgentSchedule" USING btree ("enabled","nextRunAt");