// Applies drizzle/ migrations (the same journal and table drizzle-kit uses) with two things
// `drizzle-kit migrate` lacks: it waits for Postgres to accept connections (a fresh
// `docker:dev` container takes a few seconds), and it prints the real error instead of exiting 1.
// Run: bun run db:migrate   (DATABASE_URL from .env, which Bun loads)
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const where = url.replace(/\/\/([^:@/]+)(:[^@]*)?@/, "//$1:***@");
const WAIT_SECONDS = Number(process.env.DB_WAIT_SECONDS ?? 60);

const sql = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 5 });
try {
  for (let waited = 0; ; waited += 2) {
    try {
      await sql`select 1`;
      break;
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Still starting (refused / "starting up") → keep waiting; anything else is a real problem.
      const starting = code === "ECONNREFUSED" || code === "57P03" || code === "ECONNRESET" || code === "CONNECT_TIMEOUT";
      if (!starting || waited >= WAIT_SECONDS) throw err;
      if (waited === 0) console.log(`Waiting for Postgres at ${where}…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle", migrationsTable: "__drizzle_migrations__", migrationsSchema: "public" });
  console.log("Migrations applied.");
} catch (err) {
  const e = err as { message?: string; code?: string; cause?: { message?: string } };
  console.error(`Migration failed (${where}): ${e.message ?? err}${e.code ? ` [${e.code}]` : ""}`);
  if (e.cause?.message) console.error(`  cause: ${e.cause.message}`);
  if (e.code === "ECONNREFUSED") console.error("  Is Postgres running? Try: bun run docker:dev");
  if (e.code === "28P01") console.error("  Wrong user or password in DATABASE_URL.");
  if (e.code === "3D000") console.error("  The database in DATABASE_URL does not exist.");
  if (/extension "vector"/.test(e.message ?? "")) console.error("  This Postgres has no pgvector; use the pgvector/pgvector image.");
  process.exitCode = 1;
} finally {
  await sql.end();
}
