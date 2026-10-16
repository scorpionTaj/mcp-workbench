CREATE TABLE "ChatFolder" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "pinnedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "archivedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "folderId" text;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "ChatFolder" ADD CONSTRAINT "ChatFolder_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ChatFolder_userId_idx" ON "ChatFolder" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_folderId_ChatFolder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."ChatFolder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Chat_folderId_idx" ON "Chat" USING btree ("folderId");--> statement-breakpoint
CREATE INDEX "Chat_tags_idx" ON "Chat" USING gin ("tags");