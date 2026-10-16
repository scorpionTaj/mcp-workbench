import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// The routes run against a recording fake db: every query's WHERE clause is rendered to SQL
// so the tests can check it is scoped to the signed-in user.
const h = vi.hoisted(() => {
  type Call = { op: string; where?: unknown; values?: Record<string, unknown> };
  const state = { calls: [] as Call[], rows: [] as unknown[], session: null as null | { user: { id: string; role: string } } };
  const chain = (op: string) => {
    const call: Call = { op };
    state.calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const method of ["from", "where", "orderBy", "values", "set", "returning"]) {
      builder[method] = (arg: unknown) => {
        if (method === "where") call.where = arg;
        if (method === "values" || method === "set") call.values = arg as Record<string, unknown>;
        return builder;
      };
    }
    builder.then = (resolve: (rows: unknown[]) => void) => resolve(state.rows);
    return builder;
  };
  const db = {
    select: () => chain("select"),
    insert: () => chain("insert"),
    update: () => chain("update"),
    delete: () => chain("delete"),
    query: {
      notebooks: {
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

const list = await import("@/app/api/notebooks/route");
const one = await import("@/app/api/notebooks/[id]/route");

const dialect = new PgDialect();
const render = (where: unknown) => dialect.sqlToQuery(where as SQL);

const req = (method: string, body?: unknown) =>
  new NextRequest("http://app.test/api/notebooks", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const notebook = { title: "Mine", cells: [{ id: "c1", type: "code", name: "Cell 1", source: "print(1)" }] };

/** Asserts the only query made was filtered on userId = `userId` (and the notebook id, if given). */
function expectScoped(userId: string, id?: string) {
  expect(h.state.calls).toHaveLength(1);
  const { sql, params } = render(h.state.calls[0].where);
  expect(sql).toContain('"Notebook"."userId" = $');
  expect(params).toContain(userId);
  if (id) {
    expect(sql).toContain('"Notebook"."id" = $');
    expect(sql).toMatch(/ and /);
    expect(params).toContain(id);
  }
}

beforeEach(() => {
  h.state.calls = [];
  h.state.rows = [];
  h.state.session = { user: { id: "user-a", role: "user" } };
});

describe("/api/notebooks owner scoping", () => {
  it("rejects signed-out requests before touching the db", async () => {
    h.state.session = null;
    const responses = await Promise.all([
      list.GET(req("GET"), ctx("")),
      list.POST(req("POST", notebook), ctx("")),
      one.GET(req("GET"), ctx("nb1")),
      one.PATCH(req("PATCH", { title: "x" }), ctx("nb1")),
      one.DELETE(req("DELETE"), ctx("nb1")),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect(h.state.calls).toHaveLength(0);
  });

  it("lists only the caller's notebooks", async () => {
    expect((await list.GET(req("GET"), ctx(""))).status).toBe(200);
    expectScoped("user-a");
  });

  it("creates notebooks owned by the caller, ignoring a userId in the body", async () => {
    h.state.rows = [{ id: "nb1", title: "Mine" }];
    const res = await list.POST(req("POST", { ...notebook, userId: "user-b" }), ctx(""));
    expect(res.status).toBe(201);
    expect(h.state.calls[0]).toMatchObject({ op: "insert", values: { userId: "user-a", title: "Mine" } });
  });

  it("scopes get, update and delete to the caller and the notebook id", async () => {
    h.state.rows = [{ id: "nb1", title: "Mine", cells: [] }];
    expect((await one.GET(req("GET"), ctx("nb1"))).status).toBe(200);
    expectScoped("user-a", "nb1");

    h.state.calls = [];
    expect((await one.PATCH(req("PATCH", { title: "Renamed", userId: "user-b" }), ctx("nb1"))).status).toBe(200);
    expectScoped("user-a", "nb1");
    expect(h.state.calls[0].values).not.toHaveProperty("userId");
    expect(h.state.calls[0].values).toMatchObject({ title: "Renamed" });

    h.state.calls = [];
    expect((await one.DELETE(req("DELETE"), ctx("nb1"))).status).toBe(200);
    expectScoped("user-a", "nb1");
  });

  it("answers 404 when the scoped query finds nothing (someone else's notebook)", async () => {
    h.state.session = { user: { id: "user-b", role: "user" } };
    expect((await one.GET(req("GET"), ctx("nb1"))).status).toBe(404);
    expect((await one.PATCH(req("PATCH", { title: "x" }), ctx("nb1"))).status).toBe(404);
    expect((await one.DELETE(req("DELETE"), ctx("nb1"))).status).toBe(404);
    for (const call of h.state.calls) expect(render(call.where).params).toEqual(["nb1", "user-b"]);
  });

  it("validates the body", async () => {
    expect((await list.POST(req("POST", { title: "", cells: [] }), ctx(""))).status).toBe(400);
    expect((await list.POST(req("POST", { title: "t", cells: [{ id: "x", type: "sql", source: "" }] }), ctx(""))).status).toBe(400);
    expect(h.state.calls).toHaveLength(0);
  });
});
