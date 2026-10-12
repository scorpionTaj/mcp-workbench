"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, PackageOpen, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlugins, type Marketplace, type PluginPreview, type PluginSource } from "@/hooks/use-plugins";

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Shows what a plugin contains and asks for any MCP secrets before installing it. */
function InstallReview({ source, onDone }: { source: PluginSource; onDone: () => void }) {
  const { preview, install } = usePlugins();
  const [data, setData] = useState<PluginPreview | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const loading = !data && !error;

  const ref = useRef<HTMLDivElement>(null);

  // The parent remounts this per source (key), so one fetch per mount.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    let live = true;
    preview(source)
      .then((d) => live && setData(d))
      .catch((err) => live && setError(errorText(err, "Could not read the plugin")));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missing = [...new Set(data?.mcpServers.flatMap((m) => m.missingSecrets) ?? [])];

  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle>{data ? `Install ${data.manifest.name}` : error ? "Could not install" : "Reading plugin…"}</CardTitle>
        {data?.manifest.description && <CardDescription>{data.manifest.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" />}
        {data && (
          <>
            <div className="flex flex-wrap gap-1">
              {data.manifest.version && <Badge variant="outline">v{data.manifest.version}</Badge>}
              {data.manifest.author && <Badge variant="outline">by {data.manifest.author}</Badge>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {(
                [
                  ["Skills", data.skills],
                  ["Agents", data.agents],
                  ["Slash commands", data.commands.map((c) => ({ ...c, name: `/${c.name}` }))],
                  ["MCP servers", data.mcpServers.map((m) => ({ name: m.name, description: m.url }))],
                ] as const
              ).map(([label, items]) =>
                items.length ? (
                  <div key={label}>
                    <p className="font-medium">
                      {label} ({items.length})
                    </p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {items.map((item) => (
                        <li key={item.name}>
                          <span className="font-mono text-foreground">{item.name}</span>
                          {item.description && ` — ${item.description}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
            {data.warnings.length > 0 && (
              <ul className="space-y-1 text-sm text-amber-600 dark:text-amber-400">
                {data.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}
            {missing.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Secrets for its MCP servers</legend>
                <p className="text-xs text-muted-foreground">
                  Stored encrypted. Servers whose secrets you leave empty are added disabled; you can fill them in later on
                  the Tools page.
                </p>
                {missing.map((name) => (
                  <div key={name} className="grid gap-1.5 sm:grid-cols-[14rem_1fr] sm:items-center">
                    <Label htmlFor={`secret-${name}`} className="font-mono">
                      {name}
                    </Label>
                    <Input
                      id={`secret-${name}`}
                      type="password"
                      autoComplete="off"
                      value={secrets[name] ?? ""}
                      onChange={(e) => setSecrets((s) => ({ ...s, [name]: e.target.value }))}
                    />
                  </div>
                ))}
              </fieldset>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            disabled={!data || installing}
            onClick={async () => {
              setInstalling(true);
              setError(null);
              try {
                await install(source, Object.fromEntries(Object.entries(secrets).filter(([, v]) => v)));
                onDone();
              } catch (err) {
                setError(errorText(err, "Install failed"));
              } finally {
                setInstalling(false);
              }
            }}
          >
            {installing ? "Installing…" : "Install"}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceBrowser({ installed, onPick }: { installed: Set<string>; onPick: (s: PluginSource) => void }) {
  const { browseMarketplace } = usePlugins();
  const [url, setUrl] = useState("");
  const [market, setMarket] = useState<(Marketplace & { url: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Browse a marketplace</h2>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            setMarket({ ...(await browseMarketplace(url.trim())), url: url.trim() });
          } catch (err) {
            setError(errorText(err, "Could not read marketplace"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo (with .claude-plugin/marketplace.json)"
          aria-label="Marketplace GitHub URL"
          className="min-w-0 flex-1"
          required
        />
        <Button type="submit" variant="outline" disabled={busy}>
          <Search className="w-4 h-4 mr-2" /> {busy ? "Loading…" : "Browse"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {market && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {market.name}: {market.plugins.length} plugin(s)
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {market.plugins.map((p) => (
              <Card key={p.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  {p.description && <CardDescription className="line-clamp-3">{p.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  {p.category && <Badge variant="secondary">{p.category}</Badge>}
                  {p.version && <Badge variant="outline">v{p.version}</Badge>}
                  <span className="flex-1" />
                  {installed.has(p.name) ? (
                    <Badge>Installed</Badge>
                  ) : p.installable ? (
                    <Button size="sm" onClick={() => onPick({ marketplaceUrl: market.url, name: p.name })}>
                      Review &amp; install
                    </Button>
                  ) : (
                    <Badge variant="outline" title="Only plugins hosted on GitHub can be installed here">
                      Not installable
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function PluginsPage() {
  const { plugins, isLoading, setEnabled, update, uninstall } = usePlugins();
  const [source, setSource] = useState<PluginSource | null>(null);
  const [url, setUrl] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plugins</h1>
        <p className="text-muted-foreground">
          Install Claude Code plugins from GitHub: their skills, agents, slash commands and remote MCP servers arrive
          together and are removed together.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSource({ url: url.trim() });
        }}
      >
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/tree/main/plugins/my-plugin"
          aria-label="Plugin GitHub URL"
          className="min-w-0 flex-1"
          required
        />
        <Button type="submit">
          <PackageOpen className="w-4 h-4 mr-2" /> Review plugin
        </Button>
      </form>

      {source && (
        <InstallReview
          key={JSON.stringify(source)}
          source={source}
          onDone={() => {
            setSource(null);
            setUrl("");
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Installed</h2>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {isLoading && <p className="text-muted-foreground">Loading plugins…</p>}
        {!isLoading && plugins.length === 0 && <p className="text-muted-foreground">No plugins installed yet.</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plugins.map((p) => (
            <Card key={p.id} className={`flex flex-col ${p.enabled ? "" : "opacity-60"}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Switch
                    checked={p.enabled}
                    disabled={busyId === p.id}
                    onCheckedChange={(enabled) => run(p.id, () => setEnabled(p.id, enabled))}
                    aria-label={`${p.enabled ? "Disable" : "Enable"} ${p.name}`}
                  />
                </div>
                {p.description && <CardDescription className="line-clamp-3">{p.description}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1">
                  {p.version && <Badge variant="outline">v{p.version}</Badge>}
                  {p.skillCount > 0 && <Badge variant="secondary">{p.skillCount} skill(s)</Badge>}
                  {p.agentCount > 0 && <Badge variant="secondary">{p.agentCount} agent(s)</Badge>}
                  {p.commandCount > 0 && <Badge variant="secondary">{p.commandCount} command(s)</Badge>}
                  {p.serverCount > 0 && <Badge variant="secondary">{p.serverCount} MCP server(s)</Badge>}
                  {p.warnings.length > 0 && (
                    <Badge variant="outline" title={p.warnings.join("\n")}>
                      <AlertTriangle className="w-3 h-3 mr-1" /> {p.warnings.length} warning(s)
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => run(p.id, () => update(p.id))}>
                    <RefreshCw className={`w-3 h-3 mr-1 ${busyId === p.id ? "animate-spin" : ""}`} /> Update
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={p.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source of ${p.name}`}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === p.id}
                    aria-label={`Uninstall ${p.name}`}
                    onClick={() =>
                      confirm(`Uninstall ${p.name}? Its skills, agents, commands and MCP servers are removed too.`) &&
                      run(p.id, () => uninstall(p.id))
                    }
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <MarketplaceBrowser installed={new Set(plugins.map((p) => p.name))} onPick={setSource} />
    </div>
  );
}
