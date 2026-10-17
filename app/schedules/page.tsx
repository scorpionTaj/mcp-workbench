"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CalendarClock, Loader2, Pencil, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgents } from "@/hooks/use-agents";
import { useProviders } from "@/hooks/use-providers";
import { isChatModel } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

interface Schedule {
  id: string;
  agentId: string;
  agent: { id: string; name: string; icon: string | null } | null;
  name: string;
  prompt: string;
  cron: string;
  timezone: string;
  provider: string | null;
  modelId: string | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: "running" | "ok" | "error" | null;
  lastError: string | null;
  lastChatId: string | null;
  runCount: number;
  upcoming: string[];
  webhookHost: string | null;
  notifyOn: "always" | "error";
  notifyEmail: boolean;
}

const PRESETS = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every day at 9:00", cron: "0 9 * * *" },
  { label: "Weekdays at 9:00", cron: "0 9 * * 1-5" },
  { label: "Mondays at 9:00", cron: "0 9 * * 1" },
  { label: "First of the month", cron: "0 9 1 * *" },
];
const AGENT_DEFAULT = "__agent__";

const localZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const when = (iso: string, tz?: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", ...(tz && { timeZone: tz }) });

type Draft = Pick<Schedule, "agentId" | "name" | "prompt" | "cron" | "timezone" | "notifyOn" | "notifyEmail"> & {
  model: string;
  webhook: string; // blank when editing = keep the saved URL
  removeWebhook: boolean;
};
const blank = (): Draft => ({
  agentId: "",
  name: "",
  prompt: "",
  cron: "0 9 * * 1-5",
  timezone: localZone(),
  model: AGENT_DEFAULT,
  notifyOn: "error",
  notifyEmail: false,
  webhook: "",
  removeWebhook: false,
});

function ScheduleForm({ editing, onDone }: { editing: Schedule | null; onDone: () => void }) {
  const { agents } = useAgents();
  const { providers } = useProviders();
  const models = providers.flatMap((p) => p.models.filter((m) => isChatModel(p.provider, m)).map((m) => `${p.provider}:${m.id}`));
  const [draft, setDraft] = useState<Draft>(() =>
    editing
      ? {
          ...editing,
          model: editing.provider && editing.modelId ? `${editing.provider}:${editing.modelId}` : AGENT_DEFAULT,
          webhook: "",
          removeWebhook: false,
        }
      : blank(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const preset = PRESETS.find((p) => p.cron === draft.cron)?.cron ?? "custom";
  const agent = agents.find((a) => a.id === draft.agentId);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const [provider, ...rest] = draft.model === AGENT_DEFAULT ? [null] : draft.model.split(":");
        const body = {
          agentId: draft.agentId,
          name: draft.name,
          prompt: draft.prompt,
          cron: draft.cron,
          timezone: draft.timezone,
          provider,
          modelId: provider ? rest.join(":") : null,
          notifyOn: draft.notifyOn,
          notifyEmail: draft.notifyEmail,
          ...(draft.removeWebhook
            ? { notifyWebhookUrl: null }
            : draft.webhook.trim()
              ? { notifyWebhookUrl: draft.webhook.trim() }
              : !editing && { notifyWebhookUrl: null }),
        };
        try {
          await send(editing ? `/api/schedules/${editing.id}` : "/api/schedules", editing ? "PATCH" : "POST", body);
          if (!editing) setDraft(blank());
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="sch-name">Name</Label>
        <Input id="sch-name" required maxLength={100} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Morning briefing" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sch-agent">Agent</Label>
        <Select value={draft.agentId} onValueChange={(agentId) => set({ agentId })}>
          <SelectTrigger id="sch-agent">
            <SelectValue placeholder="Choose an agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.icon} {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sch-prompt">Prompt</Label>
        <Textarea id="sch-prompt" rows={3} required maxLength={10000} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="Check the open issues on our repo and list anything urgent." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sch-when">When</Label>
          <Select value={preset} onValueChange={(v) => v !== "custom" && set({ cron: v })}>
            <SelectTrigger id="sch-when">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.cron} value={p.cron}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom (cron)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sch-cron">Cron expression</Label>
          <Input id="sch-cron" required className="font-mono" value={draft.cron} onChange={(e) => set({ cron: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sch-tz">Time zone</Label>
          <Input id="sch-tz" required value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sch-model">Model</Label>
          <Select value={draft.model} onValueChange={(model) => set({ model })}>
            <SelectTrigger id="sch-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AGENT_DEFAULT}>
                Agent&apos;s default{agent?.modelId ? ` (${agent.modelId})` : ""}
              </SelectItem>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1.5">
          <Label htmlFor="sch-webhook">Notify a webhook (optional)</Label>
          <Input
            id="sch-webhook"
            type="url"
            value={draft.webhook}
            disabled={draft.removeWebhook}
            onChange={(e) => set({ webhook: e.target.value })}
            placeholder={editing?.webhookHost ? `Saved: ${editing.webhookHost} (leave blank to keep)` : "https://hooks.slack.com/services/…"}
          />
          {editing?.webhookHost && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={draft.removeWebhook} onChange={(e) => set({ removeWebhook: e.target.checked })} />
              Remove the saved webhook
            </label>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sch-notify-on">Send when</Label>
          <Select value={draft.notifyOn} onValueChange={(v) => set({ notifyOn: v as Draft["notifyOn"] })}>
            <SelectTrigger id="sch-notify-on">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="error">A run fails</SelectItem>
              <SelectItem value="always">Every run finishes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Switch checked={draft.notifyEmail} onCheckedChange={(notifyEmail) => set({ notifyEmail })}>
          <span className="text-sm">Email me when a run finishes</span>
        </Switch>
        <span className="text-xs text-muted-foreground">(to your account email; uses &ldquo;Send when&rdquo;)</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Slack and Discord webhooks get a formatted message; other URLs get a JSON payload. Webhook URLs are stored encrypted. Email needs RESEND_API_KEY or SMTP_URL on the server.
      </p>
      <p className="text-xs text-muted-foreground">
        Each run starts a new chat with the agent. Nobody is there to approve tool calls, so only tools that never ask
        for approval are available. Runs are at least 15 minutes apart.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !draft.agentId}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} {editing ? "Save" : "Create schedule"}
        </Button>
        {editing && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function ScheduleCard({ s, onChange, onEdit }: { s: Schedule; onChange: () => void; onEdit: () => void }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = running ? "running" : s.lastStatus;
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-row items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{s.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {s.agent ? `${s.agent.icon ?? ""} ${s.agent.name}` : "Agent removed"}
              {s.modelId && ` · ${s.modelId}`}
            </p>
          </div>
          <Switch
            aria-label={s.enabled ? "Pause schedule" : "Resume schedule"}
            checked={s.enabled}
            onCheckedChange={async (enabled) => {
              await send(`/api/schedules/${s.id}`, "PATCH", { enabled });
              onChange();
            }}
          />
        </div>
        <p className="line-clamp-2 text-sm">{s.prompt}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-mono">
            {s.cron}
          </Badge>
          <span>{s.timezone}</span>
          {s.webhookHost && (
            <span>
              Notifies {s.webhookHost} {s.notifyOn === "always" ? "after every run" : "on failure"}
            </span>
          )}
          {s.notifyEmail && <span>Emails you {s.notifyOn === "always" ? "after every run" : "on failure"}</span>}
          <span className="basis-full">{s.enabled && s.nextRunAt ? `Next run ${when(s.nextRunAt)}` : "Paused"}</span>
        </div>
        {(status || s.runCount > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {status === "ok" && <Badge className="bg-success/15 text-success">Last run OK</Badge>}
            {status === "error" && <Badge className="bg-danger/15 text-danger">Last run failed</Badge>}
            {status === "running" && (
              <Badge variant="secondary">
                <Loader2 className="size-3 animate-spin" /> Running
              </Badge>
            )}
            {s.lastRunAt && <span className="text-muted-foreground">{when(s.lastRunAt)}</span>}
            <span className="text-muted-foreground">
              · {s.runCount} run{s.runCount === 1 ? "" : "s"}
            </span>
            {s.lastChatId && (
              <Link href={`/chat?id=${s.lastChatId}`} className="ml-auto text-accent underline-offset-4 hover:underline">
                Open last run
              </Link>
            )}
          </div>
        )}
        {(error || (status === "error" && s.lastError)) && <p className="text-xs text-danger">{error ?? s.lastError}</p>}
        <div className="flex flex-row flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={running}
            onClick={async () => {
              setRunning(true);
              setError(null);
              try {
                await send(`/api/schedules/${s.id}/run`, "POST");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Run failed");
              } finally {
                setRunning(false);
                onChange();
              }
            }}
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run now
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hover:text-danger"
            onClick={async () => {
              if (!confirm(`Delete "${s.name}"? Chats from earlier runs are kept.`)) return;
              await send(`/api/schedules/${s.id}`, "DELETE");
              onChange();
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchedulesPage() {
  const { data, isLoading, mutate } = useSWR<Schedule[]>("/api/schedules", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  });
  const [editing, setEditing] = useState<Schedule | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedules</h1>
        <p className="text-muted-foreground">Run an agent on a schedule: a daily briefing, a weekly report, an hourly check.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{editing ? `Edit “${editing.name}”` : "New schedule"}</CardTitle>
            <CardDescription>Times use the time zone you choose.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScheduleForm
              key={editing?.id ?? "new"}
              editing={editing}
              onDone={() => {
                setEditing(null);
                mutate();
              }}
            />
          </CardContent>
        </Card>
        <section aria-label="Your schedules" className="space-y-3">
          {isLoading && <Loader2 className="size-5 animate-spin" aria-label="Loading" />}
          {!isLoading && data?.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No schedules yet. Pick an agent, write what it should do, and choose when.
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            {data?.map((s) => (
              <ScheduleCard key={s.id} s={s} onChange={() => mutate()} onEdit={() => setEditing(s)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
