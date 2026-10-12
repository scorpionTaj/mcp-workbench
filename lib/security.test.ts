import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { resolveUploadUrl, uploadNameForMime, UPLOAD_DIR } from "@/lib/uploads";
import { proxy } from "@/proxy";

process.env.ENCRYPTION_KEY = "test-key-that-is-at-least-32-characters-long";

describe("encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("sk-secret");
    expect(decrypt(a)).toBe("sk-secret");
    expect(encrypt("sk-secret")).not.toBe(a);
  });

  it("rejects tampered ciphertext and legacy formats", () => {
    const c = encrypt("sk-secret");
    const tampered = c.slice(0, -2) + (c.endsWith("A") ? "B" : "A") + c.slice(-1);
    expect(() => decrypt(tampered)).toThrow();
    expect(() => decrypt("U2FsdGVkX1+legacy")).toThrow(/unsupported format/);
  });

  it("refuses to run without a strong key", () => {
    const key = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "short";
    expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY/);
    process.env.ENCRYPTION_KEY = key;
  });
});

describe("uploads", () => {
  it("only resolves files directly inside the uploads dir", () => {
    expect(resolveUploadUrl("/uploads/123-abc.png")).toBe(`${UPLOAD_DIR}/123-abc.png`);
    for (const bad of ["../.env", "/uploads/../../.env", "/uploads/.env", "/uploads/a/b.png", "/etc/passwd", "/uploads/"]) {
      expect(() => resolveUploadUrl(bad), bad).toThrow();
    }
  });

  it("derives the extension from the allowlisted MIME type only", () => {
    expect(uploadNameForMime("image/png")).toMatch(/\.png$/);
    expect(uploadNameForMime("text/html")).toBeNull();
    expect(uploadNameForMime("image/svg+xml")).toBeNull();
  });
});

describe("proxy CSRF guard", () => {
  const req = (method: string, origin?: string) =>
    new NextRequest("http://app.test/api/chats", {
      method,
      headers: { host: "app.test", ...(origin ? { origin } : {}) },
    });

  it("blocks cross-origin mutations", () => {
    expect(proxy(req("POST", "https://evil.example")).status).toBe(403);
  });

  it("allows same-origin, no-origin and safe requests", () => {
    expect(proxy(req("POST", "http://app.test")).status).toBe(200);
    expect(proxy(req("POST")).status).toBe(200);
    expect(proxy(req("GET", "https://evil.example")).status).toBe(200);
  });
});
