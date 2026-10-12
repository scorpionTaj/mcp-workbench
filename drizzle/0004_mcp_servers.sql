CREATE TABLE "McpServer" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"transport" text DEFAULT 'http' NOT NULL,
	"headers" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"approval" text DEFAULT 'readonly' NOT NULL,
	"disabledTools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"registryName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "McpServer_userId_idx" ON "McpServer" USING btree ("userId");