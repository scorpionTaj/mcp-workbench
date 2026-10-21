import path from "node:path";
import { mkdir, readFile, stat as fsStat, unlink, writeFile } from "node:fs/promises";
import { AwsClient } from "aws4fetch";
import { LEGACY_UPLOAD_DIR, MIME_BY_EXT, UPLOAD_DIR, safeUploadName, uploadName } from "@/lib/uploads";

/**
 * Where upload bytes live. Names are bare upload file names ("<owner>_<time>-<uuid>.<ext>");
 * the DB keeps the "/uploads/<name>" URL whichever backend holds the file.
 */
export interface UploadStorage {
  put(name: string, bytes: Uint8Array, contentType?: string): Promise<void>;
  /** The file's bytes, or null when it doesn't exist. */
  get(name: string): Promise<Buffer | null>;
  /** Removes the file; a missing file is not an error. */
  delete(name: string): Promise<void>;
  stat?(name: string): Promise<{ size: number } | null>;
}

const isMissing = (err: unknown) => (err as NodeJS.ErrnoException)?.code === "ENOENT";

/** Local disk (the default). Reads fall back to the legacy public/uploads dir. */
export function localStorage(dir = UPLOAD_DIR, legacyDir: string | null = LEGACY_UPLOAD_DIR): UploadStorage {
  const dirs = legacyDir ? [dir, legacyDir] : [dir];
  return {
    async put(name, bytes) {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, safeUploadName(name)), bytes);
    },
    async get(name) {
      safeUploadName(name);
      for (const d of dirs) {
        try {
          return await readFile(path.join(d, name));
        } catch (err) {
          if (!isMissing(err)) throw err;
        }
      }
      return null;
    },
    async delete(name) {
      safeUploadName(name);
      for (const d of dirs) await unlink(path.join(d, name)).catch((err) => { if (!isMissing(err)) throw err; });
    },
    async stat(name) {
      safeUploadName(name);
      for (const d of dirs) {
        const s = await fsStat(path.join(d, name)).catch(() => null);
        if (s) return { size: s.size };
      }
      return null;
    },
  };
}

export type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Custom endpoint for R2, MinIO, Backblaze...; AWS when unset. */
  endpoint?: string;
  forcePathStyle?: boolean;
  prefix?: string;
};

/** "https://host/bucket/key" (path style) or "https://bucket.host/key" (virtual-hosted). */
export function s3ObjectUrl(cfg: S3Config, name: string): string {
  const prefix = (cfg.prefix ?? "").replace(/^\/+|\/+$/g, "");
  const key = [...(prefix ? prefix.split("/") : []), safeUploadName(name)].map(encodeURIComponent).join("/");
  const base = new URL(cfg.endpoint || `https://s3.${cfg.region}.amazonaws.com`);
  const basePath = base.pathname.replace(/\/+$/, "");
  if (cfg.forcePathStyle) return `${base.origin}${basePath}/${encodeURIComponent(cfg.bucket)}/${key}`;
  return `${base.protocol}//${cfg.bucket}.${base.host}${basePath}/${key}`;
}

/**
 * S3-compatible object storage, signed with SigV4 via aws4fetch. Reads that miss fall back to
 * `fallback` (local disk) so files written before switching keep working until copied over.
 */
export function s3Storage(cfg: S3Config, fallback: UploadStorage | null = null): UploadStorage {
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: cfg.region,
    retries: 2,
  });
  const request = (name: string, init: RequestInit) => client.fetch(s3ObjectUrl(cfg, name), init);
  const fail = async (res: Response, op: string, name: string) => {
    const body = await res.text().catch(() => "");
    const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
    return new Error(`S3 ${op} ${name} failed: ${res.status}${code ? ` ${code}` : ""}`);
  };
  return {
    async put(name, bytes, contentType) {
      const type = contentType || MIME_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream";
      const res = await request(name, { method: "PUT", body: bytes as Uint8Array<ArrayBuffer>, headers: { "Content-Type": type } });
      if (!res.ok) throw await fail(res, "put", name);
    },
    async get(name) {
      const res = await request(name, { method: "GET" });
      if (res.status === 404) return fallback ? fallback.get(name) : null;
      if (!res.ok) throw await fail(res, "get", name);
      return Buffer.from(await res.arrayBuffer());
    },
    async delete(name) {
      const res = await request(name, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw await fail(res, "delete", name);
      await fallback?.delete(name);
    },
    async stat(name) {
      const res = await request(name, { method: "HEAD" });
      if (res.status === 404) return fallback?.stat ? fallback.stat(name) : null;
      if (!res.ok) throw await fail(res, "stat", name);
      return { size: Number(res.headers.get("content-length") ?? 0) };
    },
  };
}

type Env = Record<string, string | undefined>;

/** S3 settings from the environment, or null when S3_BUCKET is unset (local disk). */
export function s3ConfigFromEnv(env: Env = process.env): S3Config | null {
  if (!env.S3_BUCKET) return null;
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3_BUCKET is set but S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing");
  }
  return {
    bucket: env.S3_BUCKET,
    // R2 and MinIO accept us-east-1 (R2 treats it as "auto"); Backblaze needs its real region.
    region: env.S3_REGION || "us-east-1",
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true" || env.S3_FORCE_PATH_STYLE === "1",
    prefix: env.S3_PREFIX || undefined,
  };
}

export function createUploadStorage(env: Env = process.env): UploadStorage {
  const s3 = s3ConfigFromEnv(env);
  return s3 ? s3Storage(s3, localStorage()) : localStorage();
}

let storage: UploadStorage | null = null;

/** The configured backend: S3 when S3_BUCKET is set, else local disk. */
export function uploadStorage(): UploadStorage {
  return (storage ??= createUploadStorage());
}

/** Bytes of an "/uploads/<file>" URL, or null when missing. Throws on a path that could escape. */
export const readUpload = (url: string) => uploadStorage().get(uploadName(url));

export const deleteUpload = (url: string) => uploadStorage().delete(uploadName(url));
