CREATE TABLE "ServerKeyUsage" (
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
ALTER TABLE "ServerKeyUsage" ADD CONSTRAINT "ServerKeyUsage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ServerKeyUsage_userId_createdAt_idx" ON "ServerKeyUsage" USING btree ("userId","createdAt");