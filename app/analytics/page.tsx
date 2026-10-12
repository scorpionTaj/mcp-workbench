"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailyChart, compact, fillDays, type DayPoint } from "@/components/analytics/daily-chart";
import { fetcher } from "@/lib/fetcher";

interface Analytics {
  days: number;
  totals: { chats: number; prompts: number; replies: number; tokensIn: number; tokensOut: number };
  daily: DayPoint[];
  models: { provider: string; modelId: string; replies: number; tokensIn: number; tokensOut: number }[];
  agents: { name: string; icon: string | null; chats: number; replies: number }[];
  tools: { name: string; calls: number; errors: number; denied: number }[];
}

const RANGES = [7, 30, 90];

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold" title={value.toLocaleString()}>
        {compact(value)}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [asTable, setAsTable] = useState(false);
  const { data, isLoading, error } = useSWR<Analytics>(`/api/analytics?days=${days}`, fetcher, { revalidateOnFocus: false });
  const filled = data ? fillDays(data.daily, data.days) : [];
  const maxModel = Math.max(1, ...(data?.models.map((m) => m.tokensIn + m.tokensOut) ?? [0]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Usage</h1>
          <p className="text-muted-foreground">Your chats, tokens, models, agents and tool calls. Comparisons aren&apos;t stored, so they aren&apos;t counted.</p>
        </div>
        <div role="radiogroup" aria-label="Time range" className="flex gap-1 rounded-xl border border-border/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={days === r}
              onClick={() => setDays(r)}
              className={`rounded-lg px-3 py-1 text-sm ${days === r ? "bg-default font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-danger">{error.message}</p>}
      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Chats" value={data.totals.chats} hint={`${compact(data.totals.prompts)} prompts`} />
            <Tile label="Replies" value={data.totals.replies} />
            <Tile label="Tokens in" value={data.totals.tokensIn} />
            <Tile label="Tokens out" value={data.totals.tokensOut} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Tokens per day</CardTitle>
                  <CardDescription>Input plus output tokens; hover a day for the split.</CardDescription>
                </div>
                <button className="text-sm text-accent underline-offset-4 hover:underline" onClick={() => setAsTable((t) => !t)}>
                  {asTable ? "Show chart" : "Show table"}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {asTable ? (
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead className="text-right">Replies</TableHead>
                        <TableHead className="text-right">Tokens in</TableHead>
                        <TableHead className="text-right">Tokens out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filled.filter((d) => d.replies || d.tokensIn || d.tokensOut).map((d) => (
                        <TableRow key={d.day}>
                          <TableCell>{d.day}</TableCell>
                          <TableCell className="text-right tabular-nums">{d.replies}</TableCell>
                          <TableCell className="text-right tabular-nums">{d.tokensIn.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{d.tokensOut.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <DailyChart data={filled} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tokens by model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.models.length === 0 && <p className="text-sm text-muted-foreground">No replies in this period.</p>}
                {data.models.map((m) => {
                  const total = m.tokensIn + m.tokensOut;
                  return (
                    <div key={`${m.provider}:${m.modelId}`} className="space-y-1" title={`${m.tokensIn.toLocaleString()} in · ${m.tokensOut.toLocaleString()} out`}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate">
                          {m.modelId} <span className="text-muted-foreground">· {m.provider}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {compact(total)} · {m.replies} replies
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-default">
                        <div className="h-2 rounded-full bg-chart-series" style={{ width: `${(total / maxModel) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tool calls</CardTitle>
                <CardDescription>MCP tools, skills and knowledge search used by the model.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.tools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tool calls in this period.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tool</TableHead>
                        <TableHead className="text-right">Calls</TableHead>
                        <TableHead className="text-right">Errors</TableHead>
                        <TableHead className="text-right">Denied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tools.map((t) => (
                        <TableRow key={t.name}>
                          <TableCell className="font-mono text-xs">{t.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{t.calls}</TableCell>
                          <TableCell className={`text-right tabular-nums ${t.errors ? "text-danger" : ""}`}>{t.errors}</TableCell>
                          <TableCell className="text-right tabular-nums">{t.denied}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {data.agents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Chats</TableHead>
                      <TableHead className="text-right">Replies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.agents.map((a) => (
                      <TableRow key={a.name}>
                        <TableCell>
                          {a.icon} {a.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{a.chats}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.replies}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
