import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Providers run against a recording fake db, so the tests can check what is listed
// and that deletes are scoped to the signed-in user.
const h = vi.hoisted(() => {
  type Call = { op: string; where?: unknown };
  const state = { calls: [] as Call[], rows: [] as unknown[], session: null as null | { user: { id: string; role: string } } };
  const db = {
    delete: () => {
      const call: Call = { op: "delete" };
      state.calls.push(call);
      const builder: Record<string, unknown> = {
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
        findFirst: async ({ where }: { where: unknown }) => {
          state.calls.push({ op: "findFirst", where });
          return state.rows[0];
        },
      },
    },
  };
  return { state, db };
});

vi.mock("@/lib/db", async () => ({ db: h.db, schema: await import("@/lib/schema") }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => h.state.session } } }));

const config = await import("@/app/api/providers/config/route");
const status = await import("@/app/api/providers/status/route");
const { resolveProviderAccess } = await import("@/lib/models");

const dialect = new PgDialect();
const render = (where: unknown) => dialect.sqlToQuery(where as SQL);
const req = (url: string, method = "GET") => new NextRequest(`http://app.test${url}`, { method });
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  h.state.calls = [];
  h.state.rows = [];
  h.state.session = { user: { id: "user-a", role: "user" } };
});

describe("providers start empty", () => {
  it("lists no providers for a user who hasn't added any", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await status.GET(req("/api/providers/status"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    // No implicit defaults (e.g. a local Ollama) are probed or listed.
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("won't use a provider the user hasn't added", async () => {
    await expect(resolveProviderAccess("user-a", "ollama")).rejects.toThrow(/Add Ollama on the Providers page/);
  });
});

describe("DELETE /api/providers/config", () => {
  it("deletes the user's own row for that provider", async () => {
    h.state.rows = [{ id: "row-1" }];
    const res = await config.DELETE(req("/api/providers/config?provider=ollama", "DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(h.state.calls).toHaveLength(1);
    const { sql, params } = render(h.state.calls[0].where);
    expect(sql).toContain('"ProviderConfig"."userId" = $');
    expect(sql).toContain('"ProviderConfig"."provider" = $');
    expect(params).toEqual(expect.arrayContaining(["user-a", "ollama"]));
  });

  it("returns 404 when the user has no such provider", async () => {
    const res = await config.DELETE(req("/api/providers/config?provider=openai", "DELETE"), ctx);
    expect(res.status).toBe(404);
  });

  it("rejects signed-out requests before touching the db", async () => {
    h.state.session = null;
    const res = await config.DELETE(req("/api/providers/config?provider=ollama", "DELETE"), ctx);
    expect(res.status).toBe(401);
    expect(h.state.calls).toHaveLength(0);
  });
});
