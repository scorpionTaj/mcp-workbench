CREATE TABLE "UsageReport" (
	"userId" text PRIMARY KEY NOT NULL,
	"frequency" text NOT NULL,
	"nextRunAt" timestamp NOT NULL,
	"lastSentAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UsageReport" ADD CONSTRAINT "UsageReport_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "UsageReport_nextRunAt_idx" ON "UsageReport" USING btree ("nextRunAt");