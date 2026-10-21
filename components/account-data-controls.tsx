"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth-client";

export function AccountDataControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function exportData() {
    setBusy("export");
    setMessage(null);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not export account data");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "mcp-workbench-cloud-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not export account data");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    setMessage(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not delete account");
      await signOut().catch(() => undefined);
      router.replace("/sign-in?account=deleted");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete account");
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account data</CardTitle>
        <CardDescription>Download a copy of your data or permanently delete this account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Your export includes your chats, settings, files, and account records. Authentication credentials and provider secrets are excluded.</p>
          <Button variant="outline" disabled={busy !== null} onClick={() => void exportData()}>
            <Download className="size-4" /> {busy === "export" ? "Preparing export…" : "Download my data"}
          </Button>
        </div>
        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <h3 className="font-medium text-destructive">Delete account</h3>
            <p className="text-sm text-muted-foreground">This immediately cancels any subscription, removes your account data and files, and signs you out. This cannot be undone.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Type DELETE to confirm"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Type DELETE to confirm"
              className="sm:max-w-xs"
            />
            <Button variant="destructive" disabled={busy !== null || confirmation !== "DELETE"} onClick={() => void deleteAccount()}>
              <Trash2 className="size-4" /> {busy === "delete" ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </div>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          See the <a href="/terms" className="text-primary underline">Terms</a> and <a href="/privacy" className="text-primary underline">Privacy Policy</a> for more information.
        </p>
      </CardContent>
    </Card>
  );
}
