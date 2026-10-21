import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { billingConfig, getBillingAccount, stripeClient } from "@/lib/billing";
import { db, schema } from "@/lib/db";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const POST = withUser(async (_req, user) => {
  const config = billingConfig();
  const stripe = stripeClient();
  if (!config.enabled || !config.priceId || !config.appOrigin || !stripe) {
    return NextResponse.json({ error: "Subscriptions are not configured for this deployment" }, { status: 503 });
  }

  const existing = await getBillingAccount(user.id);
  if (
    existing?.stripeSubscriptionId &&
    !["canceled", "incomplete_expired"].includes(existing.subscriptionStatus)
  ) {
    return NextResponse.json({ error: "You already have an active subscription", billingPortal: true }, { status: 409 });
  }

  try {
    let customerId = existing?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email, name: user.name, metadata: { userId: user.id } },
        { idempotencyKey: `mcp-workbench-cloud-customer-${user.id}` },
      );
      customerId = customer.id;
      await db.insert(schema.billingAccounts).values({ userId: user.id, stripeCustomerId: customerId }).onConflictDoUpdate({
        target: schema.billingAccounts.userId,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: config.priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      success_url: `${config.appOrigin}/billing?checkout=success`,
      cancel_url: `${config.appOrigin}/billing?checkout=cancelled`,
    });
    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Stripe checkout session failed");
    return NextResponse.json({ error: "Could not start checkout. Try again later." }, { status: 502 });
  }
}, { sessionOnly: true, rateLimit: "billing" });
