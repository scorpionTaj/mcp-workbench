// Reads skills/plugins from public GitHub repos. Only talks to api.github.com and
// raw.githubusercontent.com, so user input can't redirect server-side fetches elsewhere.
import type { Files } from "@/lib/bundles";
import logger from "@/lib/logger";

export interface GithubSource {
  owner: string;
  repo: string;
  ref?: string;
  path: string; // folder inside the repo ("" = root)
}

const NAME = /^[A-Za-z0-9_.-]+$/;
const TEXT_EXT = /\.(md|mdx|txt|json|jsonc|ya?ml|toml|csv|tsv|xml|html?|css|js|mjs|cjs|ts|tsx|jsx|py|sh|rb|go|rs|java|sql|ini|cfg|env\.example)$/i;
const TEXT_NAMES = new Set(["LICENSE", "README", "Makefile", "Dockerfile"]);
export const FETCH_LIMITS = { fileBytes: 256 * 1024, files: 300, totalBytes: 4 * 1024 * 1024 };

/**
 * Accepts "owner/repo", "https://github.com/owner/repo[.git]", ".../tree/<ref>/<path>",
 * ".../blob/<ref>/<path>/SKILL.md" (uses the containing folder). Refs with "/" aren't supported.
 */
export function parseGithubUrl(input: string): GithubSource {
  const s = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const short = s.match(/^([^/\s]+)\/([^/\s]+)$/);
  const m = short ? [null, short[1], short[2]] : s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(tree|blob)\/([^/]+)(?:\/(.*))?)?$/);
  if (!m) throw new Error("Enter a GitHub URL like https://github.com/owner/repo/tree/main/path");
  const [, owner, repo, kind, ref, rest] = m as (string | undefined)[];
  if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo)) throw new Error("Invalid GitHub owner or repository");
  let path = (rest ?? "").replace(/^\/+/, "");
  if (kind === "blob") path = path.split("/").slice(0, -1).join("/");
  if (path.split("/").some((seg) => seg === ".." || seg === ".")) throw new Error("Invalid path");
  return { owner, repo, ref: ref || undefined, path };
}

/** Resolves a marketplace "source" relative to the marketplace's own repo. */
export function resolveMarketplaceSource(source: unknown, base: GithubSource): GithubSource | null {
  if (typeof source === "string") {
    if (!source.startsWith("./") && source !== ".") return null;
    const path = [base.path, source.replace(/^\.\/?/, "")].filter(Boolean).join("/");
    return path.split("/").includes("..") ? null : { ...base, path };
  }
  const s = source as { source?: string; repo?: string; url?: string; path?: string; ref?: string } | null;
  try {
    if (s?.source === "github" && s.repo) return { ...parseGithubUrl(s.repo), ref: s.ref, path: s.path ?? "" };
    if ((s?.source === "git-subdir" || s?.source === "url" || s?.source === "git") && s.url?.startsWith("https://github.com/")) {
      const parsed = parseGithubUrl(s.url);
      return { ...parsed, ref: s.ref ?? parsed.ref, path: s.path ?? parsed.path };
    }
  } catch {}
  return null; // npm, non-GitHub git hosts, etc.
}

export const sourceUrl = (s: GithubSource) =>
  `https://github.com/${s.owner}/${s.repo}/tree/${s.ref ?? "HEAD"}${s.path ? `/${s.path}` : ""}`;

function headers(withToken = true) {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "mcp-workbench" };
  if (withToken && process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const get = (withToken: boolean) =>
    fetch(`https://api.github.com${path}`, { headers: headers(withToken), signal: AbortSignal.timeout(15_000) });
  let res = await get(true);
  // A bad or expired GITHUB_TOKEN would block reads that work anonymously.
  if (res.status === 401 && process.env.GITHUB_TOKEN) {
    logger.warn("GITHUB_TOKEN was rejected by GitHub; retrying without it");
    res = await get(false);
  }
  if (res.status === 404) throw new Error("Repository or path not found (it must be public)");
  if (res.status === 403 || res.status === 429) throw new Error("GitHub rate limit reached; set GITHUB_TOKEN or try later");
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res.json() as Promise<T>;
}

const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/** Fetches every text file under source.path (keys relative to it), within FETCH_LIMITS. */
export async function fetchFolder(
  source: GithubSource,
  include?: string[], // only these sub-folders/files (relative to source.path)
): Promise<{ files: Files; ref: string; skipped: string[] }> {
  const ref = source.ref ?? (await gh<{ default_branch: string }>(`/repos/${source.owner}/${source.repo}`)).default_branch;
  const tree = await gh<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `/repos/${source.owner}/${source.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );
  const prefix = source.path ? source.path + "/" : "";
  const skipped: string[] = [];
  const inc = include?.map((p) => prefix + p.replace(/^\.\//, "").replace(/\/+$/, ""));
  const wanted = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix))
    .filter((e) => !inc || inc.some((p) => e.path === p || e.path.startsWith(p + "/"))).filter((e) => {
    const name = e.path.split("/").pop()!;
    const ok = (TEXT_EXT.test(name) || TEXT_NAMES.has(name)) && (e.size ?? 0) <= FETCH_LIMITS.fileBytes;
    if (!ok) skipped.push(e.path.slice(prefix.length));
    return ok;
  });
  if (!wanted.length) throw new Error("No files found at that path");
  if (wanted.length > FETCH_LIMITS.files) throw new Error(`Too many files (${wanted.length}); point at a smaller folder`);
  const total = wanted.reduce((n, e) => n + (e.size ?? 0), 0);
  if (total > FETCH_LIMITS.totalBytes) throw new Error("Folder is larger than 4 MB of text");

  const files: Files = {};
  const queue = [...wanted];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        const res = await fetch(
          `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${enc(ref)}/${enc(e.path)}`,
          { signal: AbortSignal.timeout(15_000) },
        );
        if (!res.ok) throw new Error(`Failed to download ${e.path} (${res.status})`);
        files[e.path.slice(prefix.length)] = await res.text();
      }
    }),
  );
  return { files, ref, skipped };
}

/** One file (e.g. a marketplace.json), or null if it doesn't exist. */
export async function fetchFile(source: GithubSource, path: string): Promise<string | null> {
  const ref = source.ref ?? "HEAD";
  const full = [source.path, path].filter(Boolean).join("/");
  const res = await fetch(`https://raw.githubusercontent.com/${source.owner}/${source.repo}/${enc(ref)}/${enc(full)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to download ${full} (${res.status})`);
  return res.text();
}
