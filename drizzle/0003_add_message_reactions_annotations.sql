-- Add message reactions and annotations tables for Phase 2

-- Message Reactions table
CREATE TABLE IF NOT EXISTS "MessageReaction" (
  "id" text PRIMARY KEY NOT NULL,
  "messageId" text NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "emoji" text,
  "count" integer NOT NULL DEFAULT 1,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");
CREATE INDEX IF NOT EXISTS "MessageReaction_type_idx" ON "MessageReaction"("type");

-- Message Annotations table
CREATE TABLE IF NOT EXISTS "MessageAnnotation" (
  "id" text PRIMARY KEY NOT NULL,
  "messageId" text NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "content" text,
  "color" text DEFAULT 'yellow',
  "position" integer,
  "length" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "MessageAnnotation_messageId_idx" ON "MessageAnnotation"("messageId");
CREATE INDEX IF NOT EXISTS "MessageAnnotation_type_idx" ON "MessageAnnotation"("type");
