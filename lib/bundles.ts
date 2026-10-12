// Pure parsers for Agent Skills and Claude Code plugin bundles.
// Input is a map of file path → text (already fetched); nothing here touches the network or DB.

export type Files = Record<string, string>;

export interface SkillData {
  name: string;
  description: string;
  instructions: string;
  resources: Record<string, string>;
}

export interface AgentData {
  name: string;
  description: string | null;
  systemPrompt: string;
}

export interface CommandData {
  name: string;
  description: string | null;
  argumentHint: string | null;
  prompt: string;
}

export interface McpServerData {
  name: string;
  url: string;
  transport: "http" | "sse";
  headers: Record<string, string>;
  /** Header placeholders like ${GITHUB_TOKEN} the user must fill in before the server is enabled. */
  missingSecrets: string[];
}

export interface PluginManifest {
  name: string;
  version: string | null;
  description: string | null;
  author: string | null;
}

export interface PluginBundle {
  manifest: PluginManifest;
  skills: SkillData[];
  agents: AgentData[];
  commands: CommandData[];
  mcpServers: McpServerData[];
  warnings: string[];
}

export const LIMITS = { instructions: 100_000, resourcesTotal: 1_000_000 };

/**
 * Minimal YAML frontmatter: `key: value` lines, quoted values, and indented continuation
 * lines (block scalars like `description: |`). ponytail: not a full YAML parser; nested
 * maps/lists are kept as raw strings. Swap in the `yaml` package if a bundle needs more.
 */
export function parseFrontmatter(text: string): { data: Record<string, string>; body: string } {
  const m = text.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text.trim() };
  const data: Record<string, string> = {};
  let key: string | null = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      data[key] = /^[|>][-+]?$/.test(kv[2]) ? "" : kv[2].replace(/^(["'])(.*)\1$/, "$2");
    } else if (key && /^\s+\S/.test(line)) {
      data[key] = (data[key] ? data[key] + " " : "") + line.trim();
    }
  }
  return { data, body: m[2].trim() };
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

const basename = (p: string) => p.split("/").filter(Boolean).pop() ?? p;
const stripExt = (p: string) => p.replace(/\.[^./]+$/, "");
const norm = (p: string) => p.replace(/^\.\//, "").replace(/\/+$/, "");

/** A skill folder: SKILL.md plus any other text files as resources. Paths are relative to the folder. */
export function parseSkill(files: Files, folderName = "skill"): SkillData {
  const md = files["SKILL.md"];
  if (md === undefined) throw new Error(`${folderName}: missing SKILL.md`);
  const { data, body } = parseFrontmatter(md);
  const description = data.description?.trim();
  if (!description) throw new Error(`${folderName}: SKILL.md needs a description in its frontmatter`);
  if (body.length > LIMITS.instructions) throw new Error(`${folderName}: SKILL.md is too long`);

  const resources: Record<string, string> = {};
  let total = 0;
  for (const [path, text] of Object.entries(files)) {
    if (path === "SKILL.md") continue;
    total += text.length;
    if (total > LIMITS.resourcesTotal) throw new Error(`${folderName}: resources exceed 1 MB`);
    resources[path] = text;
  }
  return { name: slug(data.name || folderName), description, instructions: body, resources };
}

/** Files under `dir/`, re-keyed relative to it. */
export function within(files: Files, dir: string): Files {
  const prefix = dir ? norm(dir) + "/" : "";
  return Object.fromEntries(
    Object.entries(files)
      .filter(([p]) => p.startsWith(prefix))
      .map(([p, t]) => [p.slice(prefix.length), t]),
  );
}

/** Folders (relative paths) that directly contain a SKILL.md. */
export function findSkillDirs(files: Files): string[] {
  return Object.keys(files)
    .filter((p) => p === "SKILL.md" || p.endsWith("/SKILL.md"))
    .map((p) => p.slice(0, -"SKILL.md".length).replace(/\/$/, ""));
}

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : []);

/**
 * Parses a plugin rooted at the top of `files`. `inline` is a marketplace entry with
 * strict:false, which can define the plugin (and its skill folders) without plugin.json.
 */
export function parsePlugin(
  files: Files,
  inline?: { name: string; description?: string; version?: string; skills?: string[] },
  fallbackName = "plugin",
): PluginBundle {
  const warnings: string[] = [];
  let raw: Record<string, unknown> = {};
  if (files[".claude-plugin/plugin.json"]) {
    try {
      raw = JSON.parse(files[".claude-plugin/plugin.json"]);
    } catch {
      throw new Error(".claude-plugin/plugin.json is not valid JSON");
    }
  }
  const author = raw.author as { name?: string } | string | undefined;
  const manifest: PluginManifest = {
    name: slug(String(raw.name ?? inline?.name ?? fallbackName)),
    version: (raw.version ?? inline?.version ?? null) as string | null,
    description: (raw.description ?? inline?.description ?? null) as string | null,
    author: typeof author === "string" ? author : (author?.name ?? null),
  };
  if (!manifest.name) throw new Error("Plugin has no name");

  // Skills
  const skillDirs = [...asList(raw.skills), ...(inline?.skills ?? [])].map(norm);
  const dirs = skillDirs.length
    ? skillDirs.flatMap((d) => (files[`${d}/SKILL.md`] ? [d] : findSkillDirs(within(files, d)).map((s) => norm(`${d}/${s}`))))
    : findSkillDirs(within(files, "skills")).map((s) => norm(`skills/${s}`));
  const skills: SkillData[] = [];
  for (const dir of [...new Set(dirs)]) {
    try {
      skills.push(parseSkill(within(files, dir), basename(dir)));
    } catch (err) {
      warnings.push((err as Error).message);
    }
  }

  // Markdown-with-frontmatter components (agents, commands)
  const mdIn = (configured: unknown, defaultDir: string) => {
    const paths = asList(configured).map(norm);
    const roots = paths.length ? paths : [defaultDir];
    return Object.keys(files).filter(
      (p) =>
        p.endsWith(".md") &&
        roots.some((r) => p === r || (p.startsWith(r + "/") && !p.slice(r.length + 1).includes("/"))),
    );
  };

  const agents: AgentData[] = mdIn(raw.agents, "agents").flatMap((p) => {
    const { data, body } = parseFrontmatter(files[p]);
    if (!body) return (warnings.push(`${p}: empty agent`), []);
    return [{ name: data.name || stripExt(basename(p)), description: data.description || null, systemPrompt: body }];
  });

  const commands: CommandData[] = mdIn(raw.commands, "commands").flatMap((p) => {
    const { data, body } = parseFrontmatter(files[p]);
    if (!body) return (warnings.push(`${p}: empty command`), []);
    return [
      {
        name: slug(stripExt(basename(p))),
        description: data.description || null,
        argumentHint: data["argument-hint"] || null,
        prompt: body,
      },
    ];
  });

  // MCP servers: plugin.json "mcpServers" (object or path) or .mcp.json ({mcpServers:{…}} or a bare map)
  let mcpRaw: unknown = raw.mcpServers;
  if (typeof mcpRaw === "string") mcpRaw = files[norm(mcpRaw)] ? JSON.parse(files[norm(mcpRaw)]) : undefined;
  if (mcpRaw === undefined && files[".mcp.json"]) {
    try {
      mcpRaw = JSON.parse(files[".mcp.json"]);
    } catch {
      warnings.push(".mcp.json is not valid JSON");
    }
  }
  const servers =
    mcpRaw && typeof mcpRaw === "object"
      ? (((mcpRaw as { mcpServers?: unknown }).mcpServers ?? mcpRaw) as Record<string, Record<string, unknown>>)
      : {};
  const mcpServers: McpServerData[] = [];
  for (const [name, cfg] of Object.entries(servers)) {
    const type = String(cfg?.type ?? (cfg?.url ? "http" : "stdio"));
    if (cfg?.command || type === "stdio") {
      warnings.push(`MCP server "${name}" runs locally (stdio) and can't be used on the hosted app; skipped`);
      continue;
    }
    if (typeof cfg?.url !== "string" || !/^https?:\/\//.test(cfg.url)) {
      warnings.push(`MCP server "${name}" has no http(s) URL; skipped`);
      continue;
    }
    const headers = (cfg.headers ?? {}) as Record<string, string>;
    const missingSecrets = [
      ...new Set(
        [cfg.url, ...Object.values(headers)].flatMap((v) => [...String(v).matchAll(/\$\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1])),
      ),
    ];
    if (cfg.url.includes("${")) {
      warnings.push(`MCP server "${name}" needs ${missingSecrets.join(", ")} in its URL; skipped`);
      continue;
    }
    mcpServers.push({ name, url: cfg.url, transport: type === "sse" ? "sse" : "http", headers, missingSecrets });
  }

  if (!skills.length && !agents.length && !commands.length && !mcpServers.length) {
    warnings.push("This plugin has no skills, agents, commands or remote MCP servers the hosted app can use");
  }
  return { manifest, skills, agents, commands, mcpServers, warnings };
}

/** Fills `${VAR}` placeholders from user-supplied values; returns null if any are still missing. */
export function resolveHeaders(headers: Record<string, string>, values: Record<string, string>) {
  let missing = false;
  const out = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [
      k,
      v.replace(/\$\{([A-Za-z0-9_]+)\}/g, (_, name) => {
        if (!values[name]) missing = true;
        return values[name] ?? "";
      }),
    ]),
  );
  return missing ? null : out;
}

/** "/name rest of text" → the command prompt with $ARGUMENTS (and $1…$9) substituted. */
export function expandCommand(prompt: string, args: string): string {
  const parts = args.split(/\s+/).filter(Boolean);
  return prompt.replace(/\$ARGUMENTS/g, args).replace(/\$([1-9])/g, (_, i) => parts[Number(i) - 1] ?? "");
}
