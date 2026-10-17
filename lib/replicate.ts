import { ProviderError } from "@/lib/model-errors";
import { checkOutboundUrl } from "@/lib/url-guard";

// Replicate runs "predictions" against public models (owner/name), not an OpenAI-style API,
// so Studio calls it directly: create with `Prefer: wait`, poll urls.get, download the output.

const MODEL_ID = /^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.-]*$/;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ReplicateImageOptions {
  prompt: string;
  size?: string;
  aspectRatio?: string;
  seed?: number;
}

interface Prediction {
  id?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
  urls?: { get?: string; cancel?: string };
}

/** The create-prediction request for one image from a public model. */
export function buildReplicateRequest(baseUrl: string, apiKey: string, modelId: string, opts: ReplicateImageOptions) {
  if (!MODEL_ID.test(modelId)) throw new ProviderError("Replicate model ids look like owner/name, e.g. black-forest-labs/flux-schnell");
  const input: Record<string, unknown> = { prompt: opts.prompt };
  if (opts.size) {
    const [width, height] = opts.size.split("x").map(Number);
    Object.assign(input, { width, height });
  }
  if (opts.aspectRatio) input.aspect_ratio = opts.aspectRatio;
  if (opts.seed !== undefined) input.seed = opts.seed;
  return {
    url: `${baseUrl.replace(/\/+$/, "")}/models/${modelId}/predictions`,
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Prefer: "wait" },
      body: JSON.stringify({ input }),
    } satisfies RequestInit,
  };
}

/** Image URLs from a prediction's output: models return either one URL or a list of them. */
export function parseReplicateOutput(output: unknown): string[] {
  const items = Array.isArray(output) ? output : [output];
  const urls = items.filter((u): u is string => typeof u === "string" && u.length > 0);
  if (!urls.length) throw new ProviderError("Replicate returned no image");
  for (const u of urls) {
    if (!u.startsWith("https://")) throw new ProviderError("Replicate returned a non-https output URL");
  }
  return urls;
}

async function replicateError(res: Response): Promise<ProviderError> {
  const body = (await res.json().catch(() => null)) as { detail?: unknown; title?: unknown } | null;
  const detail = typeof body?.detail === "string" ? body.detail : typeof body?.title === "string" ? body.title : res.statusText;
  return new ProviderError(`Replicate: ${detail || `HTTP ${res.status}`}`.slice(0, 500));
}

/** Only follow poll/cancel URLs on the configured API host, since they carry the API key. */
function sameOrigin(url: string | undefined, baseUrl: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin === new URL(baseUrl).origin ? url : null;
  } catch {
    return null;
  }
}

export interface RunOptions {
  timeoutMs?: number;
  pollMs?: number;
  fetch?: typeof fetch;
}

/** Runs one prediction to completion and returns its output image URLs. */
export async function runReplicatePrediction(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  opts: ReplicateImageOptions,
  { timeoutMs = 60_000, pollMs = 1000, fetch: f = fetch }: RunOptions = {},
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  const { url, init } = buildReplicateRequest(baseUrl, apiKey, modelId, opts);
  const res = await f(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw await replicateError(res);
  let prediction = (await res.json()) as Prediction;
  const auth = { Authorization: `Bearer ${apiKey}` };

  while (prediction.status !== "succeeded") {
    if (prediction.status === "failed" || prediction.status === "canceled") {
      const reason = typeof prediction.error === "string" ? prediction.error : `prediction ${prediction.status}`;
      throw new ProviderError(`Replicate: ${reason}`.slice(0, 500));
    }
    const getUrl = sameOrigin(prediction.urls?.get, baseUrl);
    if (!getUrl) throw new ProviderError("Replicate: prediction has no status URL");
    if (Date.now() + pollMs > deadline) {
      const cancel = sameOrigin(prediction.urls?.cancel, baseUrl);
      if (cancel) await f(cancel, { method: "POST", headers: auth }).catch(() => undefined);
      throw new ProviderError(`Replicate: prediction timed out after ${Math.round(timeoutMs / 1000)} s`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
    const poll = await f(getUrl, { headers: auth, signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())) });
    if (!poll.ok) throw await replicateError(poll);
    prediction = (await poll.json()) as Prediction;
  }
  return parseReplicateOutput(prediction.output);
}

/** Downloads one output image; the URL must be https and pass the outbound URL guard. */
export async function downloadReplicateImage(url: string, f: typeof fetch = fetch): Promise<{ uint8Array: Uint8Array; mediaType: string }> {
  if (!url.startsWith("https://")) throw new ProviderError("Replicate returned a non-https output URL");
  const blocked = await checkOutboundUrl(url);
  if (blocked) throw new ProviderError(`Replicate output URL rejected: ${blocked}`);
  const res = await f(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new ProviderError(`Replicate: downloading the image failed (HTTP ${res.status})`);
  const mediaType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!mediaType.startsWith("image/")) throw new ProviderError(`Replicate returned ${mediaType || "an unknown type"}, not an image`);
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.byteLength > MAX_IMAGE_BYTES) throw new ProviderError("Replicate image is too large");
  return { uint8Array: data, mediaType };
}

/** n images: one prediction each (not every model takes num_outputs), downloaded in order. */
export async function generateReplicateImages(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  opts: ReplicateImageOptions & { n: number },
  run: RunOptions = {},
) {
  const outputs = await Promise.all(
    Array.from({ length: opts.n }, (_, i) =>
      runReplicatePrediction(baseUrl, apiKey, modelId, { ...opts, seed: opts.seed === undefined ? undefined : opts.seed + i }, run),
    ),
  );
  const urls = outputs.flat().slice(0, opts.n);
  return Promise.all(urls.map((u) => downloadReplicateImage(u, run.fetch)));
}
