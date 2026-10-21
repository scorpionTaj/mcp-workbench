-- Idempotent: this migration was missing from the journal for a while, so a database may
-- already have it (applied from the feature branch) when it runs again.
CREATE TABLE IF NOT EXISTS "ServerKeyUsage" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" text NOT NULL,
	"modelId" text NOT NULL,
	"tokensIn" integer,
	"tokensOut" integer,
	"costUsd" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ServerKeyUsage" ADD CONSTRAINT "ServerKeyUsage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ServerKeyUsage_userId_createdAt_idx" ON "ServerKeyUsage" USING btree ("userId","createdAt");
