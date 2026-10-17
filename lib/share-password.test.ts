import { describe, expect, it } from "vitest";
import {
  hashSharePassword,
  shareAccess,
  shareCookieValue,
  verifySharePassword,
  verifyShareCookie,
  SHARE_COOKIE_TTL_S,
} from "@/lib/share-password";

process.env.BETTER_AUTH_SECRET ??= "test-secret-that-is-long-enough-for-hmac";

describe("share passwords", () => {
  it("hashes with scrypt and a random salt, and verifies", async () => {
    const a = await hashSharePassword("hunter22");
    const b = await hashSharePassword("hunter22");
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(b);
    expect(await verifySharePassword("hunter22", a)).toBe(true);
    expect(await verifySharePassword("hunter23", a)).toBe(false);
    expect(await verifySharePassword("hunter22", "garbage")).toBe(false);
  });

  it("signs an unlock cookie bound to the link and the password", async () => {
    const chat = { shareId: "tok-aaaaaaaaaaaaaaaaaaaa", shareExpiresAt: null, sharePasswordHash: await hashSharePassword("pw-1234") };
    const now = 1_700_000_000_000;
    const { value, expires } = shareCookieValue(chat, now);
    expect(expires.getTime()).toBe(now + SHARE_COOKIE_TTL_S * 1000);
    expect(verifyShareCookie(chat, value, now)).toBe(true);
    // Another link, a changed password, a tampered value or an old cookie don't pass.
    expect(verifyShareCookie({ ...chat, shareId: "tok-bbbbbbbbbbbbbbbbbbbb" }, value, now)).toBe(false);
    expect(verifyShareCookie({ ...chat, sharePasswordHash: await hashSharePassword("pw-1234") }, value, now)).toBe(false);
    expect(verifyShareCookie(chat, value.replace(/.$/, (c) => (c === "A" ? "B" : "A")), now)).toBe(false);
    expect(verifyShareCookie(chat, `${now + 10 ** 9}.${value.split(".")[1]}`, now)).toBe(false);
    expect(verifyShareCookie(chat, value, expires.getTime())).toBe(false);
    expect(verifyShareCookie(chat, undefined, now)).toBe(false);
  });

  it("caps the cookie at the link's expiry", () => {
    const now = 1_700_000_000_000;
    const chat = { shareId: "t", shareExpiresAt: new Date(now + 60_000), sharePasswordHash: "x" };
    expect(shareCookieValue(chat, now).expires.getTime()).toBe(now + 60_000);
  });

  it("decides access from expiry, password and cookie", () => {
    const now = 1_700_000_000_000;
    const open = { shareId: "t", shareExpiresAt: null, sharePasswordHash: null };
    expect(shareAccess(open, undefined, now)).toBe("ok");
    expect(shareAccess({ ...open, shareExpiresAt: new Date(now) }, undefined, now)).toBe("expired");
    expect(shareAccess({ ...open, shareExpiresAt: new Date(now + 1) }, undefined, now)).toBe("ok");
    const locked = { ...open, sharePasswordHash: "scrypt$x" };
    expect(shareAccess(locked, undefined, now)).toBe("password");
    expect(shareAccess(locked, shareCookieValue(locked, now).value, now)).toBe("ok");
    // Expiry wins even with a valid cookie.
    const both = { ...locked, shareExpiresAt: new Date(now + 1000) };
    const cookie = shareCookieValue(both, now).value;
    expect(shareAccess(both, cookie, now + 2000)).toBe("expired");
  });
});
