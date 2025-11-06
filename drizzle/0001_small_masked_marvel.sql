CREATE TABLE "Feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"feedbackType" text DEFAULT 'general' NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"rating" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolvedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "Feedback_status_idx" ON "Feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Feedback_feedbackType_idx" ON "Feedback" USING btree ("feedbackType");