import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Personal API keys: "mwb_" + 32 random bytes (base64url). Only a SHA-256 hash is stored, so a
 * key is shown once, at creation. The key is high-entropy, which makes a fast hash enough.
 */
export const API_KEY_PREFIX = "mwb_";
const KEY_RE = /^mwb_[A-Za-z0-9_-]{43}$/;
/** Characters kept in clear so a key can be recognized in the list ("mwb_AbCd…"). */
const SHOWN = 8;

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function generateApiKey() {
  const key = API_KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, prefix: key.slice(0, API_KEY_PREFIX.length + SHOWN), hash: hashApiKey(key) };
}

/** The key from `Authorization: Bearer mwb_…`; null when the header isn't one of our keys. */
export function bearerApiKey(headers: Headers): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization") ?? "");
  return match && match[1].startsWith(API_KEY_PREFIX) ? match[1] : null;
}

export const isApiKeyFormat = (key: string) => KEY_RE.test(key);

/**
 * Finds the active (not revoked) key and its owner, and records the use.
 * Returns null for unknown, malformed or revoked keys.
 */
export async function authenticateApiKey(key: string) {
  if (!isApiKeyFormat(key)) return null;
  const [row] = await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(schema.apiKeys.hash, hashApiKey(key)), isNull(schema.apiKeys.revokedAt)))
    .returning({ id: schema.apiKeys.id, userId: schema.apiKeys.userId });
  if (!row) return null;
  const [owner] = await db.select().from(schema.user).where(eq(schema.user.id, row.userId));
  return owner ? { keyId: row.id, user: owner } : null;
}

/** Columns safe to show the owner (never the hash). */
export const apiKeyColumns = {
  id: schema.apiKeys.id,
  name: schema.apiKeys.name,
  prefix: schema.apiKeys.prefix,
  lastUsedAt: schema.apiKeys.lastUsedAt,
  createdAt: schema.apiKeys.createdAt,
  revokedAt: schema.apiKeys.revokedAt,
};
