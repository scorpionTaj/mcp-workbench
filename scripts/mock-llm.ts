// Mock OpenAI-compatible LLM for local testing and e2e: streams back an echo of the last user message.
// Also serves /embeddings ("mock-embed"): hashed bag-of-words vectors, so texts sharing words are similar.
// Run: bun scripts/mock-llm.ts [port]  → add a "custom" provider with base URL http://127.0.0.1:<port>
const port = Number(process.argv[2] ?? 4010);

type Part = { type: string; text?: string };
type Msg = { role: string; content: string | Part[] };

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });

Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname.endsWith("/models")) {
      return json({
        object: "list",
        data: [
          { id: "mock-echo", object: "model", owned_by: "mock" },
          { id: "mock-embed", object: "model", owned_by: "mock" },
        ],
      });
    }
    if (pathname.endsWith("/embeddings")) {
      const { input } = (await req.json()) as { input: string | string[] };
      const inputs = Array.isArray(input) ? input : [input];
      return json({
        object: "list",
        data: inputs.map((text, index) => ({ object: "embedding", index, embedding: embedText(text) })),
        model: "mock-embed",
        usage: { prompt_tokens: inputs.length, total_tokens: inputs.length },
      });
    }
    if (!pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 });

    const body = (await req.json()) as {
      model: string;
      messages: Msg[];
      tools?: { function: { name: string } }[];
    };
    const sse = (events: object[]) =>
      new Response(
        events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n",
        { headers: { "content-type": "text/event-stream" } },
      );
    const event = (delta: object, finish: string | null = null) => ({
      id: "mock",
      object: "chat.completion.chunk",
      created: 0,
      model: body.model,
      choices: [{ index: 0, delta, finish_reason: finish }],
    });
    const usage = { id: "mock", object: "chat.completion.chunk", created: 0, model: body.model, choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };

    // After a tool ran, report its result.
    const final = body.messages[body.messages.length - 1];
    if (final?.role === "tool") {
      const result = typeof final.content === "string" ? final.content : JSON.stringify(final.content);
      return sse([event({ role: "assistant", content: `Tool said: ${result}` }), event({}, "stop"), usage]);
    }

    // "/call <tool> <json args>" makes the model call a tool (matched by name suffix).
    const lastText = (() => {
      const u = [...body.messages].reverse().find((m) => m.role === "user");
      return typeof u?.content === "string" ? u.content : (u?.content ?? []).map((p) => p.text ?? "").join(" ");
    })();
    const call = lastText.match(/^\/call (\S+)\s*(.*)$/s);
    if (call && final?.role === "user") {
      const name = body.tools?.map((t) => t.function.name).find((n) => n === call[1] || n.endsWith(`__${call[1]}`));
      if (name) {
        return sse([
          event({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name, arguments: "" } }] }),
          event({ tool_calls: [{ index: 0, function: { arguments: call[2] || "{}" } }] }),
          event({}, "tool_calls"),
          usage,
        ]);
      }
    }

    const last = [...body.messages].reverse().find((m) => m.role === "user");
    const parts = typeof last?.content === "string" ? [{ type: "text", text: last.content }] : (last?.content ?? []);
    const text = parts.filter((p) => p.type === "text").map((p) => p.text).join(" ");
    const files = parts.length - parts.filter((p) => p.type === "text").length;
    const system = body.messages.find((m) => m.role === "system");
    const reply =
      `Echo: ${text}` +
      (files ? ` (with ${files} attachment${files > 1 ? "s" : ""})` : "") +
      (system ? ` [system prompt set]` : "") +
      ` [turn ${body.messages.filter((m) => m.role === "user").length}]`;

    const chunk = (delta: object, finish: string | null = null) =>
      `data: ${JSON.stringify({
        id: "mock",
        object: "chat.completion.chunk",
        created: 0,
        model: body.model,
        choices: [{ index: 0, delta, finish_reason: finish }],
      })}\n\n`;

    const words = reply.split(/(?<= )/);
    const stream = new ReadableStream({
      async start(c) {
        const enc = new TextEncoder();
        c.enqueue(enc.encode(chunk({ role: "assistant", content: "" })));
        for (const w of words) {
          c.enqueue(enc.encode(chunk({ content: w })));
          await Bun.sleep(40);
        }
        c.enqueue(enc.encode(chunk({}, "stop")));
        c.enqueue(
          enc.encode(
            `data: ${JSON.stringify({
              id: "mock",
              object: "chat.completion.chunk",
              created: 0,
              model: body.model,
              choices: [],
              usage: { prompt_tokens: 12, completion_tokens: words.length, total_tokens: 12 + words.length },
            })}\n\ndata: [DONE]\n\n`,
          ),
        );
        c.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream" } });
  },
});

console.log(`mock LLM on http://127.0.0.1:${port}`);

function embedText(text: string, dims = 64): number[] {
  const v = new Array(dims).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let h = 2166136261;
    for (const ch of word) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    v[Math.abs(h) % dims] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}
