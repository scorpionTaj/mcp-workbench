CREATE TABLE "Generation" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"modelId" text NOT NULL,
	"prompt" text,
	"text" text,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"durationMs" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Generation_userId_createdAt_idx" ON "Generation" USING btree ("userId","createdAt");