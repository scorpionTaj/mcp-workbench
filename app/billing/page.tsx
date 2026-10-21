"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetcher } from "@/lib/fetcher";

type Billing = {
  enabled: boolean;
  freeDailyLimitUsd: number | null;
  proDailyLimitUsd: number | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasPaidAccess: boolean;
  } | null;
};

export default function BillingPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Loading billing…</main>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { data, error, isLoading, mutate } = useSWR<Billing>("/api/billing", fetcher);
  const checkoutResult = useSearchParams().get("checkout");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openBilling(path: "/api/billing/checkout" | "/api/billing/portal") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(path, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Billing request failed");
      if (result.url) window.location.assign(result.url);
      else throw new Error("Stripe did not return a destination");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Billing request failed");
      setBusy(false);
    }
  }

  const subscription = data?.subscription;
  const hasSubscription = Boolean(subscription && !["canceled", "incomplete_expired"].includes(subscription.status));

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your MCP Workbench Cloud plan and subscription.</p>
      </header>

      {checkoutResult === "success" && (
        <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
          Checkout completed. Stripe is confirming your subscription; refresh the status if it has not appeared yet.
        </div>
      )}
      {checkoutResult === "cancelled" && (
        <div role="status" className="rounded-lg border border-border p-4 text-sm">Checkout was cancelled. No subscription was started.</div>
      )}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">Could not load billing status.</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="size-5 text-primary" /> Your plan</CardTitle>
          <CardDescription>
            {isLoading ? "Loading subscription status…" : subscription?.hasPaidAccess ? "MCP Workbench Cloud Pro" : "Free"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Shared provider-key allowance: {subscription?.hasPaidAccess && data?.proDailyLimitUsd !== null
              ? `$${data?.proDailyLimitUsd} per day`
              : data?.freeDailyLimitUsd !== null
                ? `$${data?.freeDailyLimitUsd} per day`
                : "no per-user daily cap configured"}.
            {" "}Calls using your own provider API keys are billed by those providers under their terms.
          </p>
          {subscription && (
            <div className="space-y-1 text-sm">
              <p>Subscription status: <strong>{subscription.status}</strong></p>
              {subscription.currentPeriodEnd && <p>Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>}
              {subscription.cancelAtPeriodEnd && <p className="text-warning">Your subscription is set to end after this billing period.</p>}
            </div>
          )}
          {!data?.enabled ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              Paid plans are not enabled on this deployment. The operator must configure Stripe and the Pro daily allowance before checkout is available.
            </p>
          ) : hasSubscription ? (
            <Button disabled={busy} onClick={() => openBilling("/api/billing/portal")}>
              {busy ? "Opening…" : "Manage subscription"}
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => openBilling("/api/billing/checkout")}>
              {busy ? "Opening checkout…" : "Subscribe to Pro"}
            </Button>
          )}
          {checkoutResult === "success" && (
            <Button variant="outline" disabled={isLoading} onClick={() => void mutate()}>
              <RefreshCw className="size-4" /> Refresh status
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
