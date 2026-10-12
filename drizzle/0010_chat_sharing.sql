ALTER TABLE "Chat" ADD COLUMN "shareId" text;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "sharedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "forkedFromId" text;--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_shareId_unique" UNIQUE("shareId");