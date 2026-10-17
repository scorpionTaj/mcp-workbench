CREATE TABLE "ApiKey" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"hash" text NOT NULL,
	"lastUsedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp,
	CONSTRAINT "ApiKey_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
ALTER TABLE "AgentSchedule" ADD COLUMN "notifyEmail" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "shareExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "sharePasswordHash" text;--> statement-breakpoint
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey" USING btree ("userId");