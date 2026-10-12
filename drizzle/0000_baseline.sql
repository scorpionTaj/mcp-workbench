CREATE TABLE "Attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"messageId" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatTemplate" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"systemPrompt" text NOT NULL,
	"suggestedTools" text,
	"suggestedModel" text,
	"modelParams" text,
	"sampleMessages" text,
	"tags" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0,
	"author" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Chat" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"systemPrompt" text,
	"defaultProvider" text DEFAULT 'ollama' NOT NULL,
	"defaultModelId" text,
	"toolServerIds" text,
	"meta" text
);
--> statement-breakpoint
CREATE TABLE "Dataset" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"path" text NOT NULL,
	"rows" integer,
	"columns" integer,
	"indexed" boolean DEFAULT false NOT NULL,
	"embeddings" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "InstalledServer" (
	"id" text PRIMARY KEY NOT NULL,
	"serverId" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" text,
	"installedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "InstalledServer_serverId_unique" UNIQUE("serverId")
);
--> statement-breakpoint
CREATE TABLE "MessageAnnotation" (
	"id" text PRIMARY KEY NOT NULL,
	"messageId" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"color" text DEFAULT 'yellow',
	"position" integer,
	"length" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MessageReaction" (
	"id" text PRIMARY KEY NOT NULL,
	"messageId" text NOT NULL,
	"type" text NOT NULL,
	"emoji" text,
	"count" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" text PRIMARY KEY NOT NULL,
	"chatId" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"reasoning" text,
	"provider" text,
	"modelId" text,
	"toolCalls" text,
	"toolResults" text,
	"tokensIn" integer,
	"tokensOut" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ModelOverride" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"modelId" text NOT NULL,
	"isReasoning" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ModelOverride_provider_modelId_key" UNIQUE("provider","modelId")
);
--> statement-breakpoint
CREATE TABLE "ProviderConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"baseUrl" text,
	"apiKey" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ProviderConfig_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "SearchHistory" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"query" text NOT NULL,
	"filters" text,
	"resultsCount" integer DEFAULT 0,
	"selectedResult" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Settings" (
	"id" text PRIMARY KEY NOT NULL,
	"preferredInstaller" text DEFAULT 'npm' NOT NULL,
	"githubToken" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MessageAnnotation" ADD CONSTRAINT "MessageAnnotation_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Attachment_messageId_idx" ON "Attachment" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "ChatTemplate_category_idx" ON "ChatTemplate" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ChatTemplate_isPublic_idx" ON "ChatTemplate" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX "ChatTemplate_createdAt_idx" ON "ChatTemplate" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Feedback_status_idx" ON "Feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Feedback_feedbackType_idx" ON "Feedback" USING btree ("feedbackType");--> statement-breakpoint
CREATE INDEX "MessageAnnotation_messageId_idx" ON "MessageAnnotation" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "MessageAnnotation_type_idx" ON "MessageAnnotation" USING btree ("type");--> statement-breakpoint
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "MessageReaction_type_idx" ON "MessageReaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "Message_chatId_idx" ON "Message" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "SearchHistory_createdAt_idx" ON "SearchHistory" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "SearchHistory_query_idx" ON "SearchHistory" USING btree ("query");