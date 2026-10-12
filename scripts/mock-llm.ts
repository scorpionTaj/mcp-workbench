// Mock OpenAI-compatible LLM for local testing and e2e: streams back an echo of the last user message.
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
      return json({ object: "list", data: [{ id: "mock-echo", object: "model", owned_by: "mock" }] });
    }
    if (!pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 });

    const body = (await req.json()) as { model: string; messages: Msg[] };
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
