import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { billingConfig, saveSubscriptionFromEvent, stripeClient } from "@/lib/billing";
import { db, schema } from "@/lib/db";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret || !billingConfig().enabled) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (!event.type.startsWith("customer.subscription.")) return NextResponse.json({ received: true });

  try {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const existing = await db.query.billingAccounts.findFirst({
      where: eq(schema.billingAccounts.stripeCustomerId, customerId),
    });
    const metadataUserId = subscription.metadata.userId;
    if (existing && metadataUserId && existing.userId !== metadataUserId) {
      logger.error({ eventId: event.id, customerId, userId: metadataUserId }, "Stripe subscription metadata does not match its customer");
      return NextResponse.json({ error: "Subscription account mismatch" }, { status: 400 });
    }
    const userId = existing?.userId ?? metadataUserId;
    if (!userId) {
      logger.warn({ eventId: event.id, customerId }, "Ignoring Stripe subscription without an account mapping");
      return NextResponse.json({ received: true });
    }
    const owner = await db.query.user.findFirst({ where: eq(schema.user.id, userId) });
    if (!owner) return NextResponse.json({ received: true });
    await saveSubscriptionFromEvent(userId, subscription, event.created);
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, eventId: event.id, eventType: event.type }, "Stripe subscription webhook failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
