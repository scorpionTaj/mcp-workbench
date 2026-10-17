import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Passwords and expiry for shared-chat links.
 * Passwords are hashed with scrypt ("scrypt$N$r$p$salt$hash", base64url parts), which is slow on
 * purpose so a leaked hash is expensive to brute-force. A viewer who enters the right password
 * gets a signed, httpOnly cookie for that one link; changing the password invalidates it.
 */

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 32;

const scryptAsync = (password: string, salt: Buffer, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

export async function hashSharePassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifySharePassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scryptAsync(password, Buffer.from(salt, "base64url"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

type ShareSettings = { shareId: string | null; shareExpiresAt: Date | null; sharePasswordHash: string | null };

export const shareCookieName = (token: string) => `mwb_share_${token}`;
/** How long an unlocked link stays unlocked in that browser (capped by the link's expiry). */
export const SHARE_COOKIE_TTL_S = 12 * 60 * 60;

const secret = () => {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET must be set to sign share-link cookies");
  return s;
};

// Bound to the token and the current password hash, so it can't be reused for another link or
// after the password changes.
const sign = (chat: ShareSettings, exp: number) =>
  createHmac("sha256", secret()).update(`share:${chat.shareId}:${chat.sharePasswordHash}:${exp}`).digest("base64url");

/** Cookie value proving the viewer entered this link's password, valid until `exp` (ms). */
export function shareCookieValue(chat: ShareSettings, now = Date.now()) {
  const exp = Math.min(now + SHARE_COOKIE_TTL_S * 1000, chat.shareExpiresAt?.getTime() ?? Infinity);
  return { value: `${exp}.${sign(chat, exp)}`, expires: new Date(exp) };
}

export function verifyShareCookie(chat: ShareSettings, value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const [expRaw, mac] = value.split(".");
  const exp = Number(expRaw);
  if (!mac || !Number.isFinite(exp) || exp <= now) return false;
  const expected = Buffer.from(sign(chat, exp));
  const got = Buffer.from(mac);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export type ShareAccess = "ok" | "expired" | "password";

/** Whether a viewer may read a shared chat right now, given the cookie for its token. */
export function shareAccess(chat: ShareSettings, cookie: string | undefined, now = Date.now()): ShareAccess {
  if (chat.shareExpiresAt && chat.shareExpiresAt.getTime() <= now) return "expired";
  if (chat.sharePasswordHash && !verifyShareCookie(chat, cookie, now)) return "password";
  return "ok";
}
