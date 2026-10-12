CREATE TABLE "Command" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"pluginId" text,
	"name" text NOT NULL,
	"description" text,
	"argumentHint" text,
	"prompt" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Command_userId_name_key" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE "Plugin" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"version" text,
	"description" text,
	"author" text,
	"sourceUrl" text NOT NULL,
	"source" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"installedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Plugin_userId_name_key" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE "Skill" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"pluginId" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"instructions" text NOT NULL,
	"resources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sourceUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Skill_userId_name_key" UNIQUE("userId","name")
);
--> statement-breakpoint
ALTER TABLE "Agent" ADD COLUMN "skillIds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Agent" ADD COLUMN "pluginId" text;--> statement-breakpoint
ALTER TABLE "McpServer" ADD COLUMN "pluginId" text;--> statement-breakpoint
ALTER TABLE "Command" ADD CONSTRAINT "Command_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Command" ADD CONSTRAINT "Command_pluginId_Plugin_id_fk" FOREIGN KEY ("pluginId") REFERENCES "public"."Plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Plugin" ADD CONSTRAINT "Plugin_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_pluginId_Plugin_id_fk" FOREIGN KEY ("pluginId") REFERENCES "public"."Plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_pluginId_Plugin_id_fk" FOREIGN KEY ("pluginId") REFERENCES "public"."Plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_pluginId_Plugin_id_fk" FOREIGN KEY ("pluginId") REFERENCES "public"."Plugin"("id") ON DELETE cascade ON UPDATE no action;