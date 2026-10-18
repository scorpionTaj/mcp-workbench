import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import { getTableName, type SQL, type Table } from "drizzle-orm";

// A fake db holding rows for two users. Each select renders its WHERE clause to SQL and returns
// only rows whose userId and id appear in the query's parameters, so a check that forgot to
// filter by user would leak the other user's rows and fail these tests.
const h = vi.hoisted(() => {
  const state = {
    rows: {} as Record<string, { id: string; userId: string }[]>,
    queries: [] as { table: string; where: unknown }[],
    session: null as null | { user: { id: string; role: string } },
    turns: [] as unknown[],
    history: [] as unknown[],
  };
  return { state };
});

const dialect = new PgDialect();
const render = (where: unknown) => dialect.sqlToQuery(where as SQL);

vi.mock("@/lib/db", async () => {
  const schema = await import("@/lib/schema");
  const select = () => {
    let table = "";
    const builder = {
      from: (t: Table) => {
        table = getTableName(t);
        return builder;
      },
      where: (where: unknown) => {
        h.state.queries.push({ table, where });
        const { sql, params } = render(where);
        const scoped = sql.includes(`"${table}"."userId" = $`);
        const rows = (h.state.rows[table] ?? []).filter(
          (r) => (!scoped || params.includes(r.userId)) && params.includes(r.id),
        );
        return Promise.resolve(rows.map(({ id }) => ({ id })));
      },
    };
    return builder;
  };
  return {
    db: { select },
    schema,
    ownedChat: async (userId: string, id: string) => (userId === "alice" && id === "chat1" ? { id, userId } : undefined),
  };
});
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => h.state.session } } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => null }));
vi.mock("@/lib/chat-store", () => ({
  loadChatMessages: async () => h.state.history,
  truncateFrom: async () => [],
  applyApprovalResponses: (m: unknown) => m,
}));
vi.mock("@/lib/chat-turn", () => ({
  TurnError: class extends Error {},
  startChatTurn: async (args: unknown) => {
    h.state.turns.push(args);
    return new ReadableStream({ start: (c) => c.close() });
  },
}));

const { resolveTurnContext } = await import("@/lib/turn-context");
const chatRoute = await import("@/app/api/chat/route");

beforeEach(() => {
  h.state.queries = [];
  h.state.turns = [];
  h.state.history = [];
  h.state.session = { user: { id: "alice", role: "user" } };
  h.state.rows = {
    Skill: [
      { id: "s-alice", userId: "alice" },
      { id: "s-bob", userId: "bob" },
    ],
    ChatFolder: [
      { id: "f-alice", userId: "alice" },
      { id: "f-bob", userId: "bob" },
    ],
    KnowledgeBase: [
      { id: "kb-alice", userId: "alice" },
      { id: "kb-bob", userId: "bob" },
    ],
    McpServer: [
      { id: "m-alice", userId: "alice" },
      { id: "m-bob", userId: "bob" },
    ],
  };
});

describe("resolveTurnContext", () => {
  it("keeps the user's own skills and mentions", async () => {
    const { context, rejected } = await resolveTurnContext("alice", {
      skillIds: ["s-alice"],
      mentions: [
        { type: "folder", id: "f-alice" },
        { type: "knowledge", id: "kb-alice" },
        { type: "mcp", id: "m-alice" },
      ],
    });
    expect(rejected).toEqual([]);
    expect(context.skillIds).toEqual(["s-alice"]);
    expect(context.mentions).toHaveLength(3);
  });

  it("rejects every id that belongs to someone else or doesn't exist", async () => {
    const { context, rejected } = await resolveTurnContext("alice", {
      skillIds: ["s-bob", "s-alice"],
      mentions: [
        { type: "folder", id: "f-bob" },
        { type: "knowledge", id: "kb-bob" },
        { type: "mcp", id: "m-bob" },
        { type: "mcp", id: "missing" },
        { type: "knowledge", id: "kb-alice" },
      ],
    });
    expect(rejected.sort()).toEqual(["folder f-bob", "knowledge kb-bob", "mcp m-bob", "mcp missing", "skill s-bob"]);
    expect(context).toEqual({ skillIds: ["s-alice"], mentions: [{ type: "knowledge", id: "kb-alice" }] });
  });

  it("doesn't accept a folder id as a knowledge base or vice versa", async () => {
    const { rejected } = await resolveTurnContext("alice", {
      skillIds: [],
      mentions: [
        { type: "knowledge", id: "f-alice" },
        { type: "folder", id: "kb-alice" },
      ],
    });
    expect(rejected.sort()).toEqual(["folder kb-alice", "knowledge f-alice"]);
  });

  it("scopes every lookup to the user and skips empty ones", async () => {
    await resolveTurnContext("alice", { skillIds: ["s-alice"], mentions: [{ type: "mcp", id: "m-alice" }] });
    expect(h.state.queries.map((q) => q.table).sort()).toEqual(["McpServer", "Skill"]);
    for (const q of h.state.queries) {
      const { sql, params } = render(q.where);
      expect(sql).toContain(`"${q.table}"."userId" = $`);
      expect(params).toContain("alice");
    }
  });

  it("drops duplicates", async () => {
    const { context } = await resolveTurnContext("alice", {
      skillIds: ["s-alice", "s-alice"],
      mentions: [
        { type: "folder", id: "f-alice" },
        { type: "folder", id: "f-alice" },
      ],
    });
    expect(context).toEqual({ skillIds: ["s-alice"], mentions: [{ type: "folder", id: "f-alice" }] });
  });
});

const chatRequest = (context?: unknown, message: Record<string, unknown> = {}) =>
  new NextRequest("http://app.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "chat1",
      provider: "ollama",
      modelId: "llama3",
      message: { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }], ...message },
      ...(context === undefined ? {} : { context }),
    }),
  });

type Turn = { context?: unknown; messages: { metadata?: { context?: unknown } }[] };

describe("POST /api/chat context", () => {
  it("refuses another user's skill or mention before starting the turn", async () => {
    const res = await chatRoute.POST(chatRequest({ skillIds: ["s-bob"], mentions: [{ type: "mcp", id: "m-alice" }] }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).details).toEqual(["skill s-bob"]);
    expect(h.state.turns).toHaveLength(0);
  });

  it("passes the checked context to the turn and stores it on the user message", async () => {
    const context = { skillIds: ["s-alice"], mentions: [{ type: "knowledge", id: "kb-alice" }] };
    const res = await chatRoute.POST(chatRequest(context), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const turn = h.state.turns[0] as Turn;
    expect(turn.context).toEqual(context);
    expect(turn.messages.at(-1)?.metadata?.context).toEqual(context);
  });

  it("runs without context when none is sent", async () => {
    const res = await chatRoute.POST(chatRequest(), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const turn = h.state.turns[0] as Turn;
    expect(turn.context).toBeUndefined();
    expect(turn.messages.at(-1)?.metadata?.context).toBeUndefined();
  });

  it("reuses a resent message's stored context, re-checked against the user's records", async () => {
    h.state.history = [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "hi" }],
        metadata: { context: { skillIds: ["s-alice", "s-bob"], mentions: [{ type: "folder", id: "f-alice" }] } },
      },
    ];
    const res = await chatRoute.POST(chatRequest(), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect((h.state.turns[0] as Turn).context).toEqual({ skillIds: ["s-alice"], mentions: [{ type: "folder", id: "f-alice" }] });
  });

  it("checks picks echoed on the message's metadata (a retry) like body picks", async () => {
    const bad = await chatRoute.POST(chatRequest(undefined, { metadata: { context: { skillIds: ["s-bob"], mentions: [] } } }), {
      params: Promise.resolve({}),
    });
    expect(bad.status).toBe(400);
    expect(h.state.turns).toHaveLength(0);

    const ok = await chatRoute.POST(
      chatRequest(undefined, { metadata: { context: { skillIds: [], mentions: [{ type: "mcp", id: "m-alice" }] } } }),
      { params: Promise.resolve({}) },
    );
    expect(ok.status).toBe(200);
    expect((h.state.turns[0] as Turn).context).toEqual({ skillIds: [], mentions: [{ type: "mcp", id: "m-alice" }] });
  });

  it("rejects malformed context", async () => {
    const res = await chatRoute.POST(chatRequest({ mentions: [{ type: "user", id: "x" }] }), { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    expect(h.state.turns).toHaveLength(0);
  });
});
