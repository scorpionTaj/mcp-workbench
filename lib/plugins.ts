import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { checkOutboundUrl } from "@/lib/url-guard";
import {
  findSkillDirs,
  parsePlugin,
  parseSkill,
  resolveHeaders,
  within,
  type PluginBundle,
  type SkillData,
} from "@/lib/bundles";
import {
  fetchFile,
  fetchFolder,
  parseGithubUrl,
  resolveMarketplaceSource,
  sourceUrl,
  type GithubSource,
} from "@/lib/github-source";

export type PluginSource = { url: string } | { marketplaceUrl: string; name: string };

interface MarketplaceEntry {
  name: string;
  description?: string;
  version?: string;
  category?: string;
  source: unknown;
  strict?: boolean;
  skills?: string[];
}

async function readMarketplace(url: string) {
  const base = parseGithubUrl(url);
  const text = await fetchFile(base, ".claude-plugin/marketplace.json");
  if (!text) throw new Error("No .claude-plugin/marketplace.json at that location");
  let json: { name?: string; plugins?: MarketplaceEntry[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("marketplace.json is not valid JSON");
  }
  return { base, name: json.name ?? `${base.owner}/${base.repo}`, plugins: json.plugins ?? [] };
}

/** Lists a marketplace's plugins and whether the hosted app can install each. */
export async function listMarketplace(url: string) {
  const { base, name, plugins } = await readMarketplace(url);
  return {
    name,
    plugins: plugins.map((p) => ({
      name: p.name,
      description: p.description ?? null,
      version: p.version ?? null,
      category: p.category ?? null,
      installable: resolveMarketplaceSource(p.source, base) !== null,
    })),
  };
}

// Folders a plugin's components live in by default (fetched for inline marketplace plugins).
const COMPONENT_PATHS = [".claude-plugin", "agents", "commands", "skills", ".mcp.json"];

/** Fetches and parses a plugin without saving anything (used for the install preview too). */
export async function loadPlugin(source: PluginSource): Promise<{ bundle: PluginBundle; folder: GithubSource }> {
  if ("url" in source) {
    const folder = parseGithubUrl(source.url);
    const { files, ref } = await fetchFolder(folder);
    return {
      bundle: parsePlugin(files, undefined, folder.path.split("/").pop() || folder.repo),
      folder: { ...folder, ref },
    };
  }
  const { base, plugins } = await readMarketplace(source.marketplaceUrl);
  const entry = plugins.find((p) => p.name === source.name);
  if (!entry) throw new Error(`Plugin "${source.name}" is not in that marketplace`);
  const folder = resolveMarketplaceSource(entry.source, base);
  if (!folder) throw new Error(`"${entry.name}" is distributed in a way the hosted app can't install (not a GitHub source)`);
  const inline = entry.strict === false || entry.skills?.length;
  const { files, ref } = await fetchFolder(folder, inline ? [...(entry.skills ?? []), ...COMPONENT_PATHS] : undefined);
  return {
    bundle: parsePlugin(files, { name: entry.name, description: entry.description, version: entry.version, skills: entry.skills }),
    folder: { ...folder, ref },
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Saves a parsed plugin and everything in it, namespaced "plugin:item". MCP servers whose
 * header secrets weren't provided are added disabled so the user can fill them in later.
 */
async function saveBundle(
  tx: Tx,
  userId: string,
  bundle: PluginBundle,
  source: PluginSource,
  folder: GithubSource,
  secrets: Record<string, string>,
  keepServers: Map<string, { headers: string | null; enabled: boolean }> = new Map(),
) {
  const { manifest } = bundle;
  const warnings = [...bundle.warnings];
  const [plugin] = await tx
    .insert(schema.plugins)
    .values({
      userId,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      sourceUrl: sourceUrl(folder),
      source,
      warnings,
    })
    .returning();
  const ns = (n: string) => `${manifest.name}:${n}`;

  for (const s of bundle.skills) {
    const [row] = await tx
      .insert(schema.skills)
      .values({ userId, pluginId: plugin.id, ...s, name: ns(s.name), sourceUrl: plugin.sourceUrl })
      .onConflictDoNothing()
      .returning({ id: schema.skills.id });
    if (!row) warnings.push(`Skill ${ns(s.name)} already exists; kept yours`);
  }
  for (const c of bundle.commands) {
    const [row] = await tx
      .insert(schema.commands)
      .values({ userId, pluginId: plugin.id, ...c, name: ns(c.name) })
      .onConflictDoNothing()
      .returning({ id: schema.commands.id });
    if (!row) warnings.push(`Command /${ns(c.name)} already exists; kept yours`);
  }
  for (const a of bundle.agents) {
    await tx.insert(schema.agents).values({
      userId,
      pluginId: plugin.id,
      name: a.name,
      description: a.description,
      systemPrompt: a.systemPrompt,
      category: manifest.name,
      icon: "🧩",
    });
  }
  for (const m of bundle.mcpServers) {
    const name = (m.name === manifest.name ? m.name : `${manifest.name} · ${m.name}`).slice(0, 60);
    const problem = await checkOutboundUrl(m.url);
    if (problem) {
      warnings.push(`MCP server ${m.name}: ${problem}; skipped`);
      continue;
    }
    const kept = keepServers.get(name);
    const resolved = resolveHeaders(m.headers, secrets);
    const headers = kept?.headers ?? (resolved && Object.keys(resolved).length ? encrypt(JSON.stringify(resolved)) : null);
    const ready = kept ? kept.enabled : resolved !== null;
    if (!ready && !kept) warnings.push(`MCP server ${m.name} needs ${m.missingSecrets.join(", ")}; added disabled`);
    await tx.insert(schema.mcpServers).values({
      userId,
      pluginId: plugin.id,
      name,
      url: m.url,
      transport: m.transport,
      headers,
      enabled: ready,
      description: manifest.description,
    });
  }
  await tx.update(schema.plugins).set({ warnings }).where(eq(schema.plugins.id, plugin.id));
  return { ...plugin, warnings };
}

export async function installPlugin(userId: string, source: PluginSource, secrets: Record<string, string> = {}) {
  const { bundle, folder } = await loadPlugin(source);
  const existing = await db.query.plugins.findFirst({
    where: and(eq(schema.plugins.userId, userId), eq(schema.plugins.name, bundle.manifest.name)),
  });
  if (existing) throw new Error(`${bundle.manifest.name} is already installed; use Update instead`);
  return db.transaction((tx) => saveBundle(tx, userId, bundle, source, folder, secrets));
}

/** Re-fetches from the original source and replaces the plugin's contents, keeping MCP secrets and toggles. */
export async function updatePlugin(userId: string, pluginId: string) {
  const plugin = await db.query.plugins.findFirst({
    where: and(eq(schema.plugins.id, pluginId), eq(schema.plugins.userId, userId)),
  });
  if (!plugin) return null;
  const { bundle, folder } = await loadPlugin(plugin.source);
  const servers = await db.query.mcpServers.findMany({ where: eq(schema.mcpServers.pluginId, plugin.id) });
  const keep = new Map(servers.map((s) => [s.name, { headers: s.headers, enabled: s.enabled }]));
  return db.transaction(async (tx) => {
    await tx.delete(schema.plugins).where(eq(schema.plugins.id, plugin.id)); // cascades to its items
    const saved = await saveBundle(tx, userId, bundle, plugin.source, folder, {}, keep);
    await tx.update(schema.plugins).set({ enabled: plugin.enabled }).where(eq(schema.plugins.id, saved.id));
    return saved;
  });
}

/**
 * Disabling a plugin turns off its skills, commands and MCP servers. Re-enabling restores the
 * skills and commands; MCP servers are re-enabled individually (some still need secrets).
 */
export async function setPluginEnabled(userId: string, pluginId: string, enabled: boolean) {
  return db.transaction(async (tx) => {
    const [plugin] = await tx
      .update(schema.plugins)
      .set({ enabled, updatedAt: new Date() })
      .where(and(eq(schema.plugins.id, pluginId), eq(schema.plugins.userId, userId)))
      .returning();
    if (!plugin) return null;
    await tx.update(schema.skills).set({ enabled }).where(eq(schema.skills.pluginId, plugin.id));
    await tx.update(schema.commands).set({ enabled }).where(eq(schema.commands.pluginId, plugin.id));
    if (!enabled) {
      await tx.update(schema.mcpServers).set({ enabled: false }).where(eq(schema.mcpServers.pluginId, plugin.id));
    }
    return plugin;
  });
}

/** Imports every SKILL.md folder at a GitHub location as standalone (non-plugin) skills. */
export async function importSkills(userId: string, url: string) {
  const folder = parseGithubUrl(url);
  const { files } = await fetchFolder(folder);
  const dirs = findSkillDirs(files);
  if (!dirs.length) throw new Error("No SKILL.md found at that location");
  if (dirs.length > 25) throw new Error(`Found ${dirs.length} skills; point at a single skill or a smaller folder`);

  const imported: string[] = [];
  const errors: string[] = [];
  for (const dir of dirs) {
    let skill: SkillData;
    try {
      skill = parseSkill(within(files, dir), dir.split("/").pop() || folder.repo);
    } catch (err) {
      errors.push((err as Error).message);
      continue;
    }
    // Re-importing refreshes the skill in place.
    await db
      .insert(schema.skills)
      .values({ userId, ...skill, sourceUrl: sourceUrl({ ...folder, path: [folder.path, dir].filter(Boolean).join("/") }) })
      .onConflictDoUpdate({
        target: [schema.skills.userId, schema.skills.name],
        set: { description: skill.description, instructions: skill.instructions, resources: skill.resources, updatedAt: new Date() },
      });
    imported.push(skill.name);
  }
  return { imported, errors };
}
