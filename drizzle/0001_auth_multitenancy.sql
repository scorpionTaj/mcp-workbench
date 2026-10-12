CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InstalledServer" DROP CONSTRAINT "InstalledServer_serverId_unique";--> statement-breakpoint
ALTER TABLE "ModelOverride" DROP CONSTRAINT "ModelOverride_provider_modelId_key";--> statement-breakpoint
ALTER TABLE "ProviderConfig" DROP CONSTRAINT "ProviderConfig_provider_unique";--> statement-breakpoint
ALTER TABLE "ChatTemplate" ADD COLUMN "userId" text;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Dataset" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Feedback" ADD COLUMN "userId" text;--> statement-breakpoint
ALTER TABLE "InstalledServer" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ModelOverride" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ProviderConfig" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "ChatTemplate" ADD CONSTRAINT "ChatTemplate_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InstalledServer" ADD CONSTRAINT "InstalledServer_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ModelOverride" ADD CONSTRAINT "ModelOverride_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ChatTemplate_userId_idx" ON "ChatTemplate" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Chat_userId_updatedAt_idx" ON "Chat" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "Dataset_userId_idx" ON "Dataset" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "InstalledServer" ADD CONSTRAINT "InstalledServer_userId_serverId_key" UNIQUE("userId","serverId");--> statement-breakpoint
ALTER TABLE "ModelOverride" ADD CONSTRAINT "ModelOverride_userId_provider_modelId_key" UNIQUE("userId","provider","modelId");--> statement-breakpoint
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_userId_provider_key" UNIQUE("userId","provider");