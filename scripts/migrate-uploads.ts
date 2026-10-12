// One-time move of uploads from public/uploads (served to anyone) to private storage, where
// app/uploads/[name] serves each file only to the user whose dataset/chat references it.
// Run: bun scripts/migrate-uploads.ts   (set UPLOAD_DIR if you changed it)
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";

const from = path.join(process.cwd(), "public", "uploads");
const to = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");

await mkdir(to, { recursive: true });
const files = await readdir(from).catch(() => [] as string[]);
let moved = 0;
for (const name of files) {
  if (name.startsWith(".")) continue;
  await rename(path.join(from, name), path.join(to, name));
  moved++;
}
console.log(`Moved ${moved} file(s) from ${from} to ${to}`);
