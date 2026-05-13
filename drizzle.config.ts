import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Migrations strategy - faster than push
  migrations: {
    table: "__drizzle_migrations__",
    schema: "public",
  },
  verbose: true,
  strict: true,
});
