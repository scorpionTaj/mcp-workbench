import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/model-errors";
import {
  buildReplicateRequest,
  downloadReplicateImage,
  generateReplicateImages,
  parseReplicateOutput,
  runReplicatePrediction,
} from "@/lib/replicate";

vi.mock("@/lib/url-guard", () => ({ checkOutboundUrl: vi.fn(async () => null) }));

const BASE = "https://api.replicate.com/v1";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const png = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });

describe("buildReplicateRequest", () => {
  it("posts to the model's predictions endpoint with Prefer: wait", () => {
    const { url, init } = buildReplicateRequest(`${BASE}/`, "r8_key", "black-forest-labs/flux-schnell", {
      prompt: "a fox",
      aspectRatio: "16:9",
      seed: 7,
    });
    expect(url).toBe(`${BASE}/models/black-forest-labs/flux-schnell/predictions`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer r8_key", Prefer: "wait" });
    expect(JSON.parse(init.body)).toEqual({ input: { prompt: "a fox", aspect_ratio: "16:9", seed: 7 } });
  });

  it("turns a size into width and height", () => {
    const { init } = buildReplicateRequest(BASE, "k", "stability-ai/sdxl", { prompt: "p", size: "1024x768" });
    expect(JSON.parse(init.body).input).toEqual({ prompt: "p", width: 1024, height: 768 });
  });

  it("rejects model ids that aren't owner/name", () => {
    for (const id of ["flux", "a/b/c", "../x/y", "a/b?x=1"]) {
      expect(() => buildReplicateRequest(BASE, "k", id, { prompt: "p" })).toThrow(ProviderError);
    }
  });
});

describe("parseReplicateOutput", () => {
  it("accepts a single URL", () => {
    expect(parseReplicateOutput("https://replicate.delivery/a.webp")).toEqual(["https://replicate.delivery/a.webp"]);
  });

  it("accepts a list of URLs", () => {
    expect(parseReplicateOutput(["https://replicate.delivery/a.png", "https://replicate.delivery/b.png"])).toHaveLength(2);
  });

  it("rejects empty output and non-https URLs", () => {
    expect(() => parseReplicateOutput(null)).toThrow("no image");
    expect(() => parseReplicateOutput([])).toThrow("no image");
    expect(() => parseReplicateOutput(["http://169.254.169.254/latest"])).toThrow("non-https");
  });
});

describe("runReplicatePrediction", () => {
  it("returns the output when Prefer: wait finishes the prediction", async () => {
    const f = vi.fn(async () => json({ status: "succeeded", output: ["https://replicate.delivery/x.webp"] }));
    await expect(runReplicatePrediction(BASE, "k", "o/m", { prompt: "p" }, { fetch: f as typeof fetch })).resolves.toEqual([
      "https://replicate.delivery/x.webp",
    ]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("polls urls.get until the prediction succeeds", async () => {
    const get = `${BASE}/predictions/abc`;
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ status: "starting", urls: { get } }))
      .mockResolvedValueOnce(json({ status: "processing", urls: { get } }))
      .mockResolvedValueOnce(json({ status: "succeeded", output: "https://replicate.delivery/y.png" }));
    const out = await runReplicatePrediction(BASE, "k", "o/m", { prompt: "p" }, { fetch: f, pollMs: 1 });
    expect(out).toEqual(["https://replicate.delivery/y.png"]);
    expect(f.mock.calls[1][0]).toBe(get);
    expect(f.mock.calls[1][1].headers).toEqual({ Authorization: "Bearer k" });
  });

  it("surfaces a failed prediction's error", async () => {
    const f = vi.fn(async () => json({ status: "failed", error: "NSFW content detected" }));
    await expect(runReplicatePrediction(BASE, "k", "o/m", { prompt: "p" }, { fetch: f as typeof fetch })).rejects.toThrow(
      "Replicate: NSFW content detected",
    );
  });

  it("surfaces the API's detail on an HTTP error", async () => {
    const f = vi.fn(async () => json({ detail: "Invalid token." }, 401));
    await expect(runReplicatePrediction(BASE, "k", "o/m", { prompt: "p" }, { fetch: f as typeof fetch })).rejects.toThrow(
      "Replicate: Invalid token.",
    );
  });

  it("won't send the key to a status URL on another host", async () => {
    const f = vi.fn(async () => json({ status: "processing", urls: { get: "https://evil.example/poll" } }));
    await expect(runReplicatePrediction(BASE, "k", "o/m", { prompt: "p" }, { fetch: f as typeof fetch, pollMs: 1 })).rejects.toThrow(
      "no status URL",
    );
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("cancels and gives up after the timeout", async () => {
    const urls = { get: `${BASE}/predictions/abc`, cancel: `${BASE}/predictions/abc/cancel` };
    const f = vi.fn<(url: string) => Promise<Response>>(async () => json({ status: "processing", urls }));
    await expect(
      runReplicatePrediction(BASE, "k", "o/m", { prompt: "p" }, { fetch: f as typeof fetch, timeoutMs: 30, pollMs: 10 }),
    ).rejects.toThrow("timed out");
    expect(f.mock.calls.at(-1)?.[0]).toBe(urls.cancel);
  });
});

describe("downloadReplicateImage", () => {
  it("returns the bytes and media type", async () => {
    const img = await downloadReplicateImage("https://replicate.delivery/a.png", (async () => png()) as typeof fetch);
    expect(img.mediaType).toBe("image/png");
    expect(img.uint8Array).toHaveLength(4);
  });

  it("refuses non-https URLs and non-image responses", async () => {
    const f = vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } }));
    await expect(downloadReplicateImage("http://replicate.delivery/a.png", f as typeof fetch)).rejects.toThrow("non-https");
    expect(f).not.toHaveBeenCalled();
    await expect(downloadReplicateImage("https://replicate.delivery/a.png", f as typeof fetch)).rejects.toThrow("not an image");
  });
});

describe("generateReplicateImages", () => {
  it("runs one prediction per image and downloads each output", async () => {
    const f = vi.fn(async (url: string, init?: RequestInit) =>
      url.endsWith("/predictions")
        ? json({ status: "succeeded", output: [`https://replicate.delivery/${JSON.parse(String(init?.body)).input.seed}.png`] })
        : png(),
    );
    const images = await generateReplicateImages(BASE, "k", "o/m", { prompt: "p", n: 2, seed: 5 }, { fetch: f as typeof fetch });
    expect(images).toHaveLength(2);
    const downloads = f.mock.calls.map((c) => c[0]).filter((u) => u.startsWith("https://replicate.delivery/"));
    expect(downloads.sort()).toEqual(["https://replicate.delivery/5.png", "https://replicate.delivery/6.png"]);
  });
});
