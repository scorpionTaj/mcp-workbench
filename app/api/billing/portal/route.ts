import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { billingConfig, getBillingAccount, stripeClient } from "@/lib/billing";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const POST = withUser(async (_req, user) => {
  const config = billingConfig();
  const stripe = stripeClient();
  const account = await getBillingAccount(user.id);
  if (!config.enabled || !config.appOrigin || !stripe || !account) {
    return NextResponse.json({ error: "Billing is not configured for this account" }, { status: 503 });
  }
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${config.appOrigin}/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Stripe customer portal session failed");
    return NextResponse.json({ error: "Could not open billing management. Try again later." }, { status: 502 });
  }
}, { sessionOnly: true, rateLimit: "billing" });
