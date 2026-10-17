"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

type Frequency = "off" | "weekly" | "monthly";

interface ReportSettings {
  frequency: Frequency;
  nextRunAt: string | null;
  lastSentAt: string | null;
  lastError: string | null;
  emailConfigured: boolean;
}

/** Weekly or monthly usage emails (lib/usage-reports.ts), with the period's CSV attached. */
export function UsageReports() {
  const { data, mutate } = useSWR<ReportSettings>("/api/usage-report", fetcher);
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const setFrequency = async (frequency: Frequency) => {
    setBusy("save");
    setMessage(null);
    try {
      await mutate(await send<ReportSettings>("/api/usage-report", "PUT", { frequency }), { revalidate: false });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const sendNow = async () => {
    if (!data || data.frequency === "off") return;
    setBusy("send");
    setMessage(null);
    try {
      await send("/api/usage-report/send", "POST", { frequency: data.frequency });
      setMessage({ ok: true, text: "Sent. Check your inbox." });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const frequency = data?.frequency ?? "off";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-accent" /> Usage reports
        </CardTitle>
        <CardDescription>
          An email with your chats, tokens and estimated cost, plus the CSV breakdown. Weekly reports arrive on Mondays
          for the previous week, monthly ones on the 1st for the previous month (08:00 UTC).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="usage-report-frequency">Send a report</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)} disabled={!data || busy !== null}>
              <SelectTrigger id="usage-report-frequency" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Never</SelectItem>
                <SelectItem value="weekly">Every week</SelectItem>
                <SelectItem value="monthly">Every month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency !== "off" && (
            <Button variant="outline" onClick={sendNow} disabled={busy !== null || !data?.emailConfigured}>
              {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send one now
            </Button>
          )}
        </div>
        {data && !data.emailConfigured && (
          <p className="text-sm text-warning">
            Email isn&apos;t configured on this server, so no report can be sent. Set RESEND_API_KEY or SMTP_URL.
          </p>
        )}
        {data && frequency !== "off" && (
          <p className="text-xs text-muted-foreground">
            {data.nextRunAt && `Next report ${format(new Date(data.nextRunAt), "PPp")}.`}
            {data.lastSentAt && ` Last sent ${formatDistanceToNow(new Date(data.lastSentAt), { addSuffix: true })}.`}
          </p>
        )}
        {data?.lastError && frequency !== "off" && (
          <p className="text-sm text-danger">The last report failed: {data.lastError}</p>
        )}
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
