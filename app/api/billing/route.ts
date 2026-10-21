import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { billingConfig, getBillingAccount, hasPaidAccess } from "@/lib/billing";
import { freeDailyLimitUsd } from "@/lib/server-keys";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, user) => {
  const config = billingConfig();
  const record = await getBillingAccount(user.id);
  return NextResponse.json({
    enabled: config.enabled,
    freeDailyLimitUsd: freeDailyLimitUsd(),
    proDailyLimitUsd: config.dailyLimitUsd,
    subscription: record
      ? {
          status: record.subscriptionStatus,
          priceId: record.stripePriceId,
          currentPeriodEnd: record.currentPeriodEnd,
          cancelAtPeriodEnd: record.cancelAtPeriodEnd,
          hasPaidAccess: hasPaidAccess(record.subscriptionStatus, record.stripePriceId, config.priceId),
        }
      : null,
  });
});
