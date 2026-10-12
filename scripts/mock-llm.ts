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
    if (pathname === "/health") return json({ status: "ok" });
    if (pathname.endsWith("/models")) {
      return json({
        object: "list",
        data: [
          { id: "mock-echo", object: "model", owned_by: "mock" },
          { id: "mock-embed", object: "model", owned_by: "mock" },
        ],
      });
    }
    // Studio: an image is a solid colour derived from the prompt; speech is a short tone;
    // a transcript reports the uploaded file's size.
    if (pathname.endsWith("/images/generations")) {
      const { prompt, n = 1 } = (await req.json()) as { prompt: string; n?: number };
      return json({ created: 0, data: Array.from({ length: n }, (_, i) => ({ b64_json: solidPng(prompt + i) })) });
    }
    if (pathname.endsWith("/audio/transcriptions")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      return json({ text: `Mock transcript of ${file?.name ?? "audio"} (${file?.size ?? 0} bytes).` });
    }
    if (pathname.endsWith("/audio/speech")) {
      const { input } = (await req.json()) as { input: string };
      return new Response(toneWav(Math.min(3, 0.5 + input.length / 40)), { headers: { "content-type": "audio/wav" } });
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

// 64×64 PNG in one colour (hash of the text), built by hand: signature, IHDR, IDAT (zlib), IEND.
function solidPng(text: string): string {
  let h = 0;
  for (const ch of text) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const [r, g, b] = [h & 255, (h >> 8) & 255, (h >> 16) & 255];
  const size = 64;
  const raw = new Uint8Array((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) raw.set([r, g, b], y * (size * 3 + 1) + 1 + x * 3);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Uint8Array) => {
    let c = 0xffffffff;
    for (const v of buf) c = crcTable[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  ihdr.set([8, 2, 0, 0, 0], 8);
  // Bun.deflateSync is raw deflate; PNG needs zlib framing.
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib(raw)), chunk("IEND", new Uint8Array())];
  return Buffer.concat(parts).toString("base64");
}

function zlib(data: Uint8Array): Uint8Array {
  const deflated = Bun.deflateSync(data) as Uint8Array;
  let a = 1, b = 0;
  for (const v of data) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  const out = new Uint8Array(deflated.length + 6);
  out.set([0x78, 0x9c]);
  out.set(deflated, 2);
  new DataView(out.buffer).setUint32(deflated.length + 2, ((b << 16) | a) >>> 0);
  return out;
}

// 16-bit mono 16 kHz WAV of a 440 Hz tone.
function toneWav(seconds: number): Uint8Array {
  const rate = 16000, n = Math.round(rate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), true);
  return new Uint8Array(buf);
}
