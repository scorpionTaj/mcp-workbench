"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, ShieldAlert, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolCallView } from "@/lib/chat-messages";

const STATE_LABEL: Record<string, string> = {
  "input-streaming": "Preparing",
  "input-available": "Running",
  "approval-requested": "Needs approval",
  "approval-responded": "Answered",
  "output-available": "Done",
  "output-error": "Failed",
  "output-denied": "Denied",
};

// "server__tool" → ["server", "tool"]
const splitName = (name: string) => {
  const i = name.indexOf("__");
  return i < 0 ? ["", name] : [name.slice(0, i), name.slice(i + 2)];
};

function Json({ value }: { value: unknown }) {
  return (
    <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted/50 p-2 text-[11px] leading-snug whitespace-pre-wrap break-all">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function ToolCallCard({
  call,
  onApproval,
}: {
  call: ToolCallView;
  onApproval?: (approvalId: string, approved: boolean) => void;
}) {
  const [open, setOpen] = useState(call.state === "approval-requested");
  const [server, tool] = splitName(call.toolName);
  const pending = call.state === "approval-requested" && !call.approval?.isAutomatic;
  const busy = call.state === "input-streaming" || call.state === "input-available";

  return (
    <div className="rounded-lg border border-border/60 text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-2 text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Wrench className="w-3 h-3 text-amber-500 shrink-0" />
        <span className="font-semibold">{tool}</span>
        {server && <span className="text-muted-foreground">via {server}</span>}
        <span
          className={`ml-auto flex items-center gap-1 ${
            call.state === "output-error" || call.state === "output-denied"
              ? "text-destructive"
              : pending
                ? "text-amber-500"
                : "text-muted-foreground"
          }`}
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          {STATE_LABEL[call.state] ?? call.state}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 p-2 space-y-2">
          {call.input !== undefined && (
            <div>
              <span className="text-muted-foreground">Input</span>
              <Json value={call.input} />
            </div>
          )}
          {call.output !== undefined && (
            <div>
              <span className="text-muted-foreground">Output</span>
              <Json value={call.output} />
            </div>
          )}
          {call.error && <p className="text-destructive">{call.error}</p>}
          {call.approval?.reason && <p className="text-muted-foreground">Reason: {call.approval.reason}</p>}
        </div>
      )}

      {pending && call.approval && onApproval && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span className="flex-1 min-w-40">{call.approval.requestReason ?? "This tool needs your approval to run."}</span>
          <Button size="sm" onClick={() => onApproval(call.approval!.id, true)}>
            <Check className="w-3 h-3 mr-1" />
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApproval(call.approval!.id, false)}>
            <X className="w-3 h-3 mr-1" />
            Deny
          </Button>
        </div>
      )}
    </div>
  );
}
