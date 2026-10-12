CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "KnowledgeBase" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"embeddingProvider" text NOT NULL,
	"embeddingModel" text NOT NULL,
	"chunkSize" integer DEFAULT 1000 NOT NULL,
	"chunkOverlap" integer DEFAULT 150 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "KnowledgeBase_userId_name_key" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE "KnowledgeChunk" (
	"id" text PRIMARY KEY NOT NULL,
	"knowledgeBaseId" text NOT NULL,
	"documentId" text NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED
);
--> statement-breakpoint
CREATE TABLE "KnowledgeDocument" (
	"id" text PRIMARY KEY NOT NULL,
	"knowledgeBaseId" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sourceUrl" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"error" text,
	"chunkCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Agent" ADD COLUMN "knowledgeBaseIds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "knowledgeBaseIds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_knowledgeBaseId_KnowledgeBase_id_fk" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."KnowledgeBase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_KnowledgeDocument_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."KnowledgeDocument"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_knowledgeBaseId_KnowledgeBase_id_fk" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."KnowledgeBase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "KnowledgeChunk_knowledgeBaseId_idx" ON "KnowledgeChunk" USING btree ("knowledgeBaseId");--> statement-breakpoint
CREATE INDEX "KnowledgeChunk_tsv_idx" ON "KnowledgeChunk" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "KnowledgeDocument_knowledgeBaseId_idx" ON "KnowledgeDocument" USING btree ("knowledgeBaseId");