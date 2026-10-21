CREATE TABLE "BillingAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"stripeCustomerId" text NOT NULL,
	"stripeSubscriptionId" text,
	"stripePriceId" text,
	"subscriptionStatus" text DEFAULT 'inactive' NOT NULL,
	"currentPeriodEnd" timestamp,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"lastStripeEventCreated" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "BillingAccount_userId_unique" UNIQUE("userId"),
	CONSTRAINT "BillingAccount_stripeCustomerId_unique" UNIQUE("stripeCustomerId"),
	CONSTRAINT "BillingAccount_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "policyAccepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "policyAcceptedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "policyVersion" text;--> statement-breakpoint
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
