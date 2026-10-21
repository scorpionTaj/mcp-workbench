"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Library,
  Lightbulb,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Puzzle,
  Server,
  ShieldCheck,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { signOut, useSession } from "@/lib/auth-client";
import { parseMcpConfig, type ConfigImport } from "@/lib/mcp-config-import";
import { useAgents } from "@/hooks/use-agents";
import { useChats } from "@/hooks/use-chats";
import { useKnowledgeBases } from "@/hooks/use-knowledge";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { usePlugins } from "@/hooks/use-plugins";
import { useSkills } from "@/hooks/use-skills";
import { ApiKeys } from "@/components/api-keys";
import { UsageReports } from "@/components/usage-reports";
import { AccountDataControls } from "@/components/account-data-controls";

const THEMES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

const EXAMPLE = `{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}`;

function Stat({ href, icon: Icon, label, value }: { href: string; icon: LucideIcon; label: string; value: number }) {
  return (
    <Link href={href} className="group rounded-xl border border-border/60 bg-surface p-4 transition-colors hover:border-accent/50">
      <Icon className="size-5 text-accent" aria-hidden />
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground group-hover:text-foreground">{label}</p>
    </Link>
  );
}

function ImportServers() {
  const { servers: existing, addServer } = useMcpServers();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ConfigImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; ok: boolean; message?: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const taken = new Set(existing.map((s) => s.name));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="size-5 text-accent" /> Import MCP servers
        </CardTitle>
        <CardDescription>
          Paste an <code>mcpServers</code> config from Claude Desktop, Cursor or VS Code. Remote (URL) servers are added
          to your MCP servers; local stdio servers can&apos;t run in a hosted app and are listed instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          aria-label="MCP config JSON"
          rows={8}
          className="font-mono text-xs"
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
            setResults(null);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!text.trim()}
            onClick={() => {
              setError(null);
              try {
                setParsed(parseMcpConfig(text));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not read the config");
              }
            }}
          >
            Preview
          </Button>
          {parsed && parsed.servers.length > 0 && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const out = [];
                for (const s of parsed.servers) {
                  if (taken.has(s.name)) {
                    out.push({ name: s.name, ok: false, message: "a server with this name already exists" });
                    continue;
                  }
                  try {
                    await addServer({ name: s.name, url: s.url, transport: s.transport, headers: s.headers });
                    out.push({ name: s.name, ok: true });
                  } catch (err) {
                    out.push({ name: s.name, ok: false, message: err instanceof Error ? err.message : "failed" });
                  }
                }
                setResults(out);
                setBusy(false);
              }}
            >
              {busy ? "Adding…" : `Add ${parsed.servers.length} server(s)`}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {parsed && !results && (
          <ul className="space-y-1 text-sm">
            {parsed.servers.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.url}</span>
                <Badge variant="outline">{s.transport}</Badge>
                {Object.keys(s.headers).length > 0 && <Badge variant="outline">{Object.keys(s.headers).length} header(s)</Badge>}
              </li>
            ))}
            {parsed.skipped.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <AlertTriangle className="size-4 text-warning" />
                <span className="font-medium text-foreground">{s.name}</span> skipped: {s.reason}
              </li>
            ))}
            {parsed.servers.length === 0 && parsed.skipped.length === 0 && <li>No servers in that config.</li>}
          </ul>
        )}
        {results && (
          <ul className="space-y-1 text-sm" role="status">
            {results.map((r) => (
              <li key={r.name} className="flex items-center gap-2">
                {r.ok ? <CheckCircle2 className="size-4 text-success" /> : <AlertTriangle className="size-4 text-danger" />}
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground">{r.ok ? "added" : r.message}</span>
              </li>
            ))}
            <li>
              <Link href="/tools" className="text-accent underline-offset-4 hover:underline">
                Open the MCP Inspector
              </Link>{" "}
              to test them and choose which tools need approval.
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme: storedTheme, setTheme } = useTheme();
  // The theme is only known in the browser; match the server render until mounted.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const theme = mounted ? storedTheme : undefined;
  const { chats } = useChats();
  const { agents } = useAgents();
  const { skills } = useSkills();
  const { plugins } = usePlugins();
  const { knowledgeBases } = useKnowledgeBases();
  const { servers } = useMcpServers();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Your account, appearance and workspace.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{user?.name ?? "…"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {user?.role === "admin" && <Badge>admin</Badge>}
            <div>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut();
                  router.push("/sign-in");
                  router.refresh();
                }}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>System follows your operating system&apos;s setting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-colors ${
                    theme === value ? "border-accent bg-accent/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Workspace</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat href="/chat" icon={MessageSquare} label="Chats" value={chats.length} />
          <Stat href="/agents" icon={Lightbulb} label="Your agents" value={agents.filter((a) => a.owner === "me").length} />
          <Stat href="/skills" icon={Sparkles} label="Skills" value={skills.length} />
          <Stat href="/plugins" icon={Puzzle} label="Plugins" value={plugins.length} />
          <Stat href="/knowledge" icon={Library} label="Knowledge bases" value={knowledgeBases.length} />
          <Stat href="/tools" icon={Server} label="MCP servers" value={servers.length} />
        </div>
      </section>

      <ImportServers />

      <ApiKeys />

      <UsageReports />

      <AccountDataControls />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-success" /> How your data is handled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Provider API keys and MCP server headers are encrypted (AES-256-GCM) in the app&apos;s PostgreSQL database and never sent back to the browser.</li>
            <li>Everything you create is private to your account unless you share an agent.</li>
            <li>Requests leave the server only for the model providers, MCP servers, GitHub plugin sources and web pages you configure.</li>
            <li>Tool calls follow each MCP server&apos;s approval policy; approvals are signed so they can&apos;t be forged.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
