ALTER TABLE "ModelOverride" ALTER COLUMN "isReasoning" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ModelOverride" ADD COLUMN "inputPricePerM" double precision;--> statement-breakpoint
ALTER TABLE "ModelOverride" ADD COLUMN "outputPricePerM" double precision;