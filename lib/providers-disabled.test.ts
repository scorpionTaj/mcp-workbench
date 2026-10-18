import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Disabled providers stay listed on /providers (so they can be switched back on) but are
// flagged so model pickers can leave them out. Runs against a recording fake db.
const h = vi.hoisted(() => {
  type Call = { op: string; where?: unknown; set?: unknown };
  const state = { calls: [] as Call[], rows: [] as unknown[], session: null as null | { user: { id: string; role: string } } };
  const db = {
    update: () => {
      const call: Call = { op: "update" };
      state.calls.push(call);
      const builder: Record<string, unknown> = {
        set: (set: unknown) => ((call.set = set), builder),
        where: (where: unknown) => ((call.where = where), builder),
        returning: () => builder,
        then: (resolve: (rows: unknown[]) => void) => resolve(state.rows),
      };
      return builder;
    },
    query: {
      providerConfigs: {
        findMany: async ({ where }: { where: unknown }) => {
          state.calls.push({ op: "findMany", where });
          return state.rows;
        },
      },
    },
  };
  return { state, db };
});

vi.mock("@/lib/db", async () => ({ db: h.db, schema: await import("@/lib/schema") }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => h.state.session } } }));

const status = await import("@/app/api/providers/status/route");
const toggle = await import("@/app/api/providers/toggle/route");

const dialect = new PgDialect();
const render = (where: unknown) => dialect.sqlToQuery(where as SQL);
const ctx = { params: Promise.resolve({}) };
const row = (provider: string, enabled: boolean) => ({
  id: `row-${provider}`,
  userId: "user-a",
  provider,
  name: provider,
  type: "local",
  baseUrl: null,
  apiKey: null,
  enabled,
  config: null,
});

beforeEach(() => {
  h.state.calls = [];
  h.state.rows = [];
  h.state.session = { user: { id: "user-a", role: "user" } };
});

describe("GET /api/providers/status", () => {
  it("lists disabled rows, flagged and not probed", async () => {
    h.state.rows = [row("ollama", false), row("lmstudio", false)];
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await status.GET(new NextRequest("http://app.test/api/providers/status"), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((p: { provider: string }) => p.provider)).toEqual(["ollama", "lmstudio"]);
    for (const p of body) {
      expect(p).toMatchObject({ enabled: false, connected: false, models: [] });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("queries every row of the user's, not only enabled ones", async () => {
    await status.GET(new NextRequest("http://app.test/api/providers/status"), ctx);
    const { sql, params } = render(h.state.calls[0].where);
    expect(sql).toContain('"ProviderConfig"."userId" = $');
    expect(sql).not.toContain('"enabled"');
    expect(params).toEqual(["user-a"]);
  });
});

describe("PUT /api/providers/toggle", () => {
  const put = (body: unknown) =>
    new NextRequest("http://app.test/api/providers/toggle", { method: "PUT", body: JSON.stringify(body) });

  it("re-enables the user's own row", async () => {
    h.state.rows = [{ ...row("ollama", true), apiKey: "secret" }];
    const res = await toggle.PUT(put({ provider: "ollama", enabled: true }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ provider: "ollama", enabled: true, hasApiKey: true });
    expect(body).not.toHaveProperty("apiKey");
    const call = h.state.calls[0];
    expect(call.set).toMatchObject({ enabled: true });
    const { sql, params } = render(call.where);
    expect(sql).toContain('"ProviderConfig"."userId" = $');
    expect(params).toEqual(expect.arrayContaining(["user-a", "ollama"]));
  });

  it("returns 404 when the user has no such provider", async () => {
    const res = await toggle.PUT(put({ provider: "openai", enabled: false }), ctx);
    expect(res.status).toBe(404);
  });
});
