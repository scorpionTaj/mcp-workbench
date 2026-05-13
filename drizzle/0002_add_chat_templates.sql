-- Create ChatTemplate table for chat templates system
CREATE TABLE IF NOT EXISTS "ChatTemplate" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'general',
  "systemPrompt" text NOT NULL,
  "suggestedTools" text,
  "suggestedModel" text,
  "modelParams" text,
  "sampleMessages" text,
  "tags" text,
  "isPublic" boolean NOT NULL DEFAULT false,
  "usageCount" integer NOT NULL DEFAULT 0,
  "rating" integer DEFAULT 0,
  "author" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "ChatTemplate_category_idx" ON "ChatTemplate"("category");
CREATE INDEX IF NOT EXISTS "ChatTemplate_isPublic_idx" ON "ChatTemplate"("isPublic");
CREATE INDEX IF NOT EXISTS "ChatTemplate_createdAt_idx" ON "ChatTemplate"("createdAt");
