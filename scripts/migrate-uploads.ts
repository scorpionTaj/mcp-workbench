// One-time move of uploads from public/uploads (served to anyone) to private storage, where
// app/uploads/[name] serves each file only to the user whose dataset/chat references it.
// Run: bun scripts/migrate-uploads.ts   (set UPLOAD_DIR if you changed it)
//
// With --to-s3, instead copies every local upload (UPLOAD_DIR and public/uploads) to the bucket
// configured by the S3_* variables. Local files are left in place; delete them once verified.
import { mkdir, readdir, readFile, rename } from "node:fs/promises";
import path from "node:path";

const from = path.join(process.cwd(), "public", "uploads");
const to = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");

const listFiles = async (dir: string) =>
  (await readdir(dir, { withFileTypes: true }).catch(() => [])).filter((e) => e.isFile() && !e.name.startsWith(".")).map((e) => e.name);

if (process.argv.includes("--to-s3")) {
  const { s3ConfigFromEnv, s3Storage } = await import("../lib/storage");
  const cfg = s3ConfigFromEnv();
  if (!cfg) throw new Error("Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY first");
  const s3 = s3Storage(cfg);
  let copied = 0;
  let skipped = 0;
  for (const dir of [to, from]) {
    for (const name of await listFiles(dir)) {
      if (await s3.stat!(name)) {
        skipped++;
        continue;
      }
      await s3.put(name, await readFile(path.join(dir, name)));
      copied++;
    }
  }
  console.log(`Copied ${copied} file(s) to s3://${cfg.bucket}/${cfg.prefix ?? ""} (${skipped} already there)`);
} else {
  await mkdir(to, { recursive: true });
  let moved = 0;
  for (const name of await listFiles(from)) {
    await rename(path.join(from, name), path.join(to, name));
    moved++;
  }
  console.log(`Moved ${moved} file(s) from ${from} to ${to}`);
}
