import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createUploadStorage, localStorage, s3ConfigFromEnv, s3ObjectUrl, s3Storage, type S3Config } from "@/lib/storage";

describe("local upload storage", () => {
  let dir: string;
  let legacy: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "uploads-"));
    legacy = path.join(dir, "legacy");
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("puts, gets, stats and deletes files", async () => {
    const store = localStorage(path.join(dir, "new"), legacy);
    expect(await store.get("u1_1-a.png")).toBeNull();
    await store.put("u1_1-a.png", new Uint8Array([1, 2, 3]), "image/png");
    expect([...(await store.get("u1_1-a.png"))!]).toEqual([1, 2, 3]);
    expect(await store.stat!("u1_1-a.png")).toEqual({ size: 3 });
    await store.delete("u1_1-a.png");
    expect(await store.get("u1_1-a.png")).toBeNull();
    await store.delete("u1_1-a.png"); // already gone: no error
  });

  it("reads and deletes legacy public/uploads files", async () => {
    await mkdir(legacy, { recursive: true });
    await writeFile(path.join(legacy, "old.pdf"), "pdf");
    const store = localStorage(path.join(dir, "new"), legacy);
    expect((await store.get("old.pdf"))?.toString()).toBe("pdf");
    await store.delete("old.pdf");
    expect(existsSync(path.join(legacy, "old.pdf"))).toBe(false);
  });

  it("rejects names that could escape the uploads dir", async () => {
    const store = localStorage(dir, null);
    for (const bad of ["../x.png", ".env", "a/b.png", "a\\b.png", ""]) {
      await expect(store.get(bad), bad).rejects.toThrow(/Invalid upload path/);
      await expect(store.put(bad, new Uint8Array()), bad).rejects.toThrow(/Invalid upload path/);
      await expect(store.delete(bad), bad).rejects.toThrow(/Invalid upload path/);
    }
  });
});

describe("S3 upload storage", () => {
  const cfg: S3Config = { bucket: "bkt", region: "eu-west-1", accessKeyId: "AKIDEXAMPLE", secretAccessKey: "secret" };
  let requests: Request[];
  let respond: (req: Request) => Response;

  beforeEach(() => {
    requests = [];
    respond = () => new Response(null, { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async (req: Request) => {
      requests.push(req);
      return respond(req);
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("builds virtual-hosted, path-style and prefixed object URLs", () => {
    expect(s3ObjectUrl(cfg, "u_1-a.png")).toBe("https://bkt.s3.eu-west-1.amazonaws.com/u_1-a.png");
    expect(s3ObjectUrl({ ...cfg, endpoint: "http://minio:9000", forcePathStyle: true, prefix: "/app/uploads/" }, "u_1-a.png"))
      .toBe("http://minio:9000/bkt/app/uploads/u_1-a.png");
    expect(s3ObjectUrl({ ...cfg, endpoint: "https://acct.r2.cloudflarestorage.com" }, "u_1-a.png"))
      .toBe("https://bkt.acct.r2.cloudflarestorage.com/u_1-a.png");
    expect(() => s3ObjectUrl(cfg, "../secret")).toThrow(/Invalid upload path/);
  });

  it("signs PUT requests with SigV4 and the content type", async () => {
    await s3Storage(cfg).put("u_1-a.png", new Uint8Array([1, 2]), "image/png");
    const [req] = requests;
    expect(req.method).toBe("PUT");
    expect(req.url).toBe("https://bkt.s3.eu-west-1.amazonaws.com/u_1-a.png");
    expect(req.headers.get("content-type")).toBe("image/png");
    expect(req.headers.get("x-amz-content-sha256")).toBe("UNSIGNED-PAYLOAD");
    expect(req.headers.get("x-amz-date")).toMatch(/^\d{8}T\d{6}Z$/);
    expect(req.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/eu-west-1\/s3\/aws4_request, SignedHeaders=[a-z0-9;-]*host[a-z0-9;-]*, Signature=[0-9a-f]{64}$/,
    );
    expect(new Uint8Array(await req.arrayBuffer())).toEqual(new Uint8Array([1, 2]));
  });

  it("derives the stored content type from the extension when none is given", async () => {
    await s3Storage(cfg).put("u_1-a.csv", new Uint8Array([1]));
    expect(requests[0].headers.get("content-type")).toBe("text/csv; charset=utf-8");
  });

  it("gets bytes, returns null on 404 and falls back to local disk", async () => {
    respond = () => new Response(new Uint8Array([7, 8]));
    expect([...(await s3Storage(cfg).get("u_1-a.png"))!]).toEqual([7, 8]);
    expect(requests[0].method).toBe("GET");

    respond = () => new Response("<Error><Code>NoSuchKey</Code></Error>", { status: 404 });
    expect(await s3Storage(cfg).get("u_1-a.png")).toBeNull();
    const fallback = { put: vi.fn(), get: vi.fn(async () => Buffer.from("local")), delete: vi.fn(async () => {}) };
    expect((await s3Storage(cfg, fallback).get("u_1-a.png"))?.toString()).toBe("local");
  });

  it("throws on other errors with the S3 error code", async () => {
    respond = () => new Response("<Error><Code>AccessDenied</Code></Error>", { status: 403 });
    await expect(s3Storage(cfg).get("u_1-a.png")).rejects.toThrow(/403 AccessDenied/);
  });

  it("deletes from S3 and the local fallback, ignoring 404", async () => {
    respond = () => new Response(null, { status: 404 });
    const fallback = { put: vi.fn(), get: vi.fn(), delete: vi.fn(async () => {}) };
    await s3Storage(cfg, fallback).delete("u_1-a.png");
    expect(requests[0].method).toBe("DELETE");
    expect(fallback.delete).toHaveBeenCalledWith("u_1-a.png");
  });
});

describe("storage selection", () => {
  it("uses local disk unless S3_BUCKET is set", () => {
    expect(s3ConfigFromEnv({})).toBeNull();
    expect(s3ConfigFromEnv({ S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s" })).toMatchObject({
      bucket: "b",
      region: "us-east-1",
      forcePathStyle: false,
    });
    expect(
      s3ConfigFromEnv({
        S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s",
        S3_ENDPOINT: "http://minio:9000", S3_FORCE_PATH_STYLE: "true", S3_PREFIX: "p",
      }),
    ).toMatchObject({ region: "us-east-1", endpoint: "http://minio:9000", forcePathStyle: true, prefix: "p" });
  });

  it("refuses a bucket without credentials", () => {
    expect(() => createUploadStorage({ S3_BUCKET: "b" })).toThrow(/S3_ACCESS_KEY_ID/);
  });
});
