import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// A fake db that records each query's WHERE clause and returns canned rows per operation.
const h = vi.hoisted(() => {
  type Call = { op: string; where?: unknown; values?: Record<string, unknown> };
  const state = {
    calls: [] as Call[],
    rows: { update: [] as unknown[], select: [] as unknown[] },
    session: null as null | { user: { id: string; role: string } },
  };
  const chain = (op: "update" | "select") => {
    const call: Call = { op };
    state.calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const method of ["from", "where", "set", "returning"]) {
      builder[method] = (arg: unknown) => {
        if (method === "where") call.where = arg;
        if (method === "set") call.values = arg as Record<string, unknown>;
        return builder;
      };
    }
    builder.then = (resolve: (rows: unknown[]) => void) => resolve(state.rows[op]);
    return builder;
  };
  return { state, db: { update: () => chain("update"), select: () => chain("select") } };
});

vi.mock("@/lib/db", async () => ({ db: h.db, schema: await import("@/lib/schema") }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => h.state.session } } }));

const { generateApiKey, hashApiKey, bearerApiKey, isApiKeyFormat } = await import("@/lib/api-keys");
const { withUser } = await import("@/lib/api");

const dialect = new PgDialect();
const owner = { id: "u1", name: "Ann", email: "ann@example.com", role: "admin" };

type Ctx = { params: Promise<Record<string, string>> };
const call = (handler: (req: NextRequest, ctx: Ctx) => Promise<Response>, auth?: string) =>
  handler(
    new NextRequest("http://app.test/api/x", { headers: auth ? { authorization: auth } : {} }),
    { params: Promise.resolve({}) },
  );

beforeEach(() => {
  h.state.calls = [];
  h.state.rows = { update: [], select: [] };
  h.state.session = null;
  process.env.RATE_LIMIT = "off";
});

describe("API key format and hashing", () => {
  it("makes mwb_ keys from 32 random bytes and stores only a SHA-256 hash", () => {
    const { key, prefix, hash } = generateApiKey();
    expect(key).toMatch(/^mwb_[A-Za-z0-9_-]{43}$/);
    expect(isApiKeyFormat(key)).toBe(true);
    expect(key.startsWith(prefix)).toBe(true);
    expect(prefix).toHaveLength(12);
    expect(hash).toBe(hashApiKey(key));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(key.slice(4));
    expect(generateApiKey().key).not.toBe(key);
  });

  it("reads the key from the Authorization header", () => {
    const h = (v: string) => new Headers({ authorization: v });
    expect(bearerApiKey(h("Bearer mwb_abc"))).toBe("mwb_abc");
    expect(bearerApiKey(h("bearer mwb_abc"))).toBe("mwb_abc");
    expect(bearerApiKey(h("Bearer some-other-token"))).toBeNull();
    expect(bearerApiKey(new Headers())).toBeNull();
  });
});

describe("withUser with a bearer key", () => {
  const ok = withUser(async (_req, user) => Response.json({ id: user.id, role: user.role }));

  it("looks up active keys by hash and runs as the owner, never as admin", async () => {
    const { key } = generateApiKey();
    h.state.rows.update = [{ id: "k1", userId: "u1" }];
    h.state.rows.select = [owner];
    const res = await call(ok, `Bearer ${key}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u1", role: "user" });
    const { sql, params } = dialect.sqlToQuery(h.state.calls[0].where as SQL);
    expect(sql).toContain('"ApiKey"."hash" = $');
    expect(sql).toContain('"ApiKey"."revokedAt" is null');
    expect(params).toContain(hashApiKey(key));
    expect(h.state.calls[0].values).toHaveProperty("lastUsedAt");
  });

  it("rejects revoked or unknown keys without falling back to the session", async () => {
    h.state.session = { user: { id: "u1", role: "user" } };
    h.state.rows.update = []; // a revoked key matches no row
    expect((await call(ok, `Bearer ${generateApiKey().key}`)).status).toBe(401);
    expect((await call(ok, "Bearer mwb_short")).status).toBe(401);
  });

  it("refuses admin and session-only routes before touching the db", async () => {
    const admin = withUser(async () => Response.json({}), { admin: true });
    const sessionOnly = withUser(async () => Response.json({}), { sessionOnly: true });
    expect((await call(admin, `Bearer ${generateApiKey().key}`)).status).toBe(403);
    expect((await call(sessionOnly, `Bearer ${generateApiKey().key}`)).status).toBe(403);
    expect(h.state.calls).toHaveLength(0);
  });

  it("rate-limits per key", async () => {
    process.env.RATE_LIMIT = "on";
    h.state.rows.update = [{ id: "k-limited", userId: "u1" }];
    h.state.rows.select = [owner];
    const { RATE_LIMITS } = await import("@/lib/rate-limit");
    const key = `Bearer ${generateApiKey().key}`;
    for (let i = 0; i < RATE_LIMITS.apiKey.points; i++) expect((await call(ok, key)).status).toBe(200);
    expect((await call(ok, key)).status).toBe(429);
  });

  it("still accepts the session cookie", async () => {
    h.state.session = { user: { id: "u2", role: "admin" } };
    expect(await (await call(ok)).json()).toEqual({ id: "u2", role: "admin" });
    expect((await call(ok)).status).toBe(200);
  });
});
